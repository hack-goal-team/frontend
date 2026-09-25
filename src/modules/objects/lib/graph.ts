import type { Edge, Node } from "@vue-flow/core";
import type { Channel } from "@/modules/channels/types";
import { RISK_LABEL } from "@/modules/predictions/consts";
import { MAX_CHILD_OBJECT_NODES, UNKNOWN_VALUE } from "../consts";
import { objectLabel } from "./label";
import { isRiskCertain } from "./risk";
import type { NodeRisk, ObjectTreeNode } from "../types";

/**
 * Проекция «предки → фокус → дети/каналы» и детерминированный макет.
 *
 * Рёбра выводятся ровно из двух отношений контракта: `InfrastructureObject.parentId`
 * (иерархия) и `Channel.objectId` (владение каналом). Топологии потока здесь нет — ребро
 * «участок → участок» было бы выдумкой, весь смысл названия раздела («Иерархия объекта»).
 *
 * Порядок каналов — по пикетам (`mergeChannelPages` сортирует по `piket`, null в конец),
 * поэтому колонка идёт вдоль физической трассы. Соседство узлов при этом — всё ещё не
 * соединение «участок → участок»: такого ребра в контракте нет, и подписей участков фронт
 * не знает. Запрет сортировать каналы и детей по риску остаётся — сортировка закодировала
 * бы ложное «проблемный канал идёт следующим по трассе».
 *
 * Функции чистые и без Vue: `buildObjectGraph` — структура, `layoutGraph` — координаты,
 * `toFlowNodes`/`toFlowEdges` — единственная граница с типами Vue Flow.
 */

/** Стабильные id: на меняющемся ключе Vue Flow пересоздаёт узлы и path рёбер при каждом рефетче. */
export const GRAPH_ID = {
  object: (id: string) => `obj:${id}`,
  channel: (id: string) => `ch:${id}`,
  moreChannels: "more:channels",
  moreChildren: "more:children",
  state: (name: string) => `state:${name}`,
  edge: (source: string, target: string) => `${source}->${target}`,
} as const;

/**
 * Размеры узлов заданы числами здесь, а не измеряются из DOM: координаты считаются
 * до первого кадра, и плавающая высота сдвигала бы фокус на каждой перерисовке.
 */
export const GRAPH_LAYOUT = {
  columnStep: 320,
  rowStep: 92,
  size: {
    object: { width: 248, height: 76 },
    channel: { width: 232, height: 52 },
    aux: { width: 232, height: 52 },
  },
} as const;

export type GraphKind = "object" | "channel" | "aux";

export type AuxKind = "more-channels" | "more-children" | "channels-loading" | "channels-error" | "channels-empty";

export interface ObjectNodeData {
  kind: "object";
  object: ObjectTreeNode["object"];
  risk: NodeRisk | null;
  /** Узел, ради которого открыт экран: он выделяется и на него центрируется вид. */
  focused: boolean;
  detached: boolean;
}

export interface ChannelNodeData {
  kind: "channel";
  channel: Channel;
  risk: NodeRisk | null;
  highlighted: boolean;
  /** Прогноз для перехода по клику; null — карточка не кликабельна, открыть нечего. */
  predictionId: string | null;
}

export interface AuxNodeData {
  kind: "aux";
  aux: AuxKind;
  /** Сколько скрыто («+ ещё N»); null — числа нет, когда X-Total-Count не пришёл. */
  count: number | null;
}

export type GraphNodeData = ObjectNodeData | ChannelNodeData | AuxNodeData;

export interface GraphNode {
  id: string;
  type: GraphKind;
  column: number;
  row: number;
  position: { x: number; y: number };
  width: number;
  height: number;
  data: GraphNodeData;
  ariaLabel: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface ObjectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  /** false у уровня 2: каналов по контракту нет, и колонки «нет данных» для него тоже нет. */
  channelColumnPresent: boolean;
  focusId: string;
  /** id узла подсветки, только если канал реально отрисован. */
  highlightedId: string | null;
}

/** "off" — источника каналов ещё нет (инкремент до подключения `/channels`). */
export type ChannelColumnState = "off" | "loading" | "error" | "empty" | "ready";

export interface BuildGraphInput {
  focus: ObjectTreeNode;
  /** От корня к фокусу; `[]` — родитель в выдаче не найден (осиротевшая запись либо 404-подобный случай). */
  ancestors: ObjectTreeNode[];
  /** Каналы в порядке выдачи; обрезку по лимиту делает эта функция. */
  channels: Channel[];
  channelState: ChannelColumnState;
  /** null — X-Total-Count не пришёл: «+ ещё N» и «из M» тогда без числа. */
  channelTotal: number | null;
  /** `hasMore` последней страницы — утверждение схемы, работает и без счётчика. */
  hasMoreChannels?: boolean;
  riskOfNode: (node: ObjectTreeNode) => NodeRisk | null;
  riskOfChannel?: (channel: Channel) => NodeRisk | null;
  /** Прогноз для перехода по клику; null/undefined — карточка канала не кликабельна. */
  predictionOfChannel?: (channel: Channel) => string | null;
  highlightChannel?: string | null;
  /** Сколько детей-объектов показывать: «+ ещё» догружает из уже принятого дерева, без запроса. */
  childLimit?: number;
}

function riskWords(risk: NodeRisk | null): string {
  if (!risk) return `риск ${UNKNOWN_VALUE}`;
  // Тот же критерий, что у ○ на карточке: «прогнозов нет» озвучиваем только когда это утверждение.
  if (!risk.level) return isRiskCertain(risk) ? "активных прогнозов нет" : `риск ${UNKNOWN_VALUE}`;
  return `${RISK_LABEL[risk.level].toLowerCase()} риск`;
}

function objectAria(node: ObjectTreeNode, risk: NodeRisk | null): string {
  const parts = [objectLabel(node.object), riskWords(risk)];
  if (node.detached) parts.push("родитель не найден в реестре");
  return parts.join(", ");
}

function channelAria(channel: Channel, risk: NodeRisk | null, predictionId: string | null): string {
  const name = channel.name?.trim() || `Канал #${channel.id}`;
  const parts = [name, channel.sensorType, riskWords(risk)];
  if (!channel.known) parts.push("нет в реестре");
  if (predictionId) parts.push("откроются детали прогноза");
  return parts.join(", ");
}

type Cell = { column: number; row: number; kind: GraphKind };
type Placed = Omit<GraphNode, "position" | "width" | "height">;

/**
 * Координаты из колонок и строк. Фокус центрирован по блоку следующего уровня
 * (центр блока = `(rows - 1) * rowStep / 2` плюс половина высоты узла), предки идут
 * на одной вертикали с фокусом.
 *
 * `position` в Vue Flow — верхний левый угол, поэтому поправка на половину высоты обязательна:
 * без неё фокус уезжает вверх на колонке более высоких узлов.
 *
 * Высота блока берётся от первого узла следующей колонки: в смешанной колонке (объекты +
 * «+ ещё») возможен сдвиг на полузла. Это косметика, а не ошибка — вид центрируется по
 * однотипным колонкам (каналы), а смешанные всегда короче лимита и влезают в кадр.
 */
export function layoutGraph(cells: Cell[], focusColumn: number): Map<string, { x: number; y: number }> {
  const nextColumn = focusColumn + 1;
  let rows = 0;
  let nextKind: GraphKind = "object";

  for (const cell of cells) {
    if (cell.column === nextColumn) {
      rows = Math.max(rows, cell.row + 1);
      nextKind = cell.kind;
    }
  }

  const blockCenter = rows > 0 ? ((rows - 1) * GRAPH_LAYOUT.rowStep) / 2 + GRAPH_LAYOUT.size[nextKind].height / 2 : 0;
  const sharedY = blockCenter - GRAPH_LAYOUT.size.object.height / 2;

  const positions = new Map<string, { x: number; y: number }>();
  for (const cell of cells) {
    positions.set(`${cell.column}:${cell.row}`, {
      x: cell.column * GRAPH_LAYOUT.columnStep,
      y: cell.column === nextColumn ? cell.row * GRAPH_LAYOUT.rowStep : sharedY,
    });
  }

  return positions;
}

export function buildObjectGraph(input: BuildGraphInput): ObjectGraph {
  const {
    focus,
    ancestors,
    channels,
    channelState,
    channelTotal,
    hasMoreChannels,
    riskOfNode,
    riskOfChannel,
    predictionOfChannel,
    highlightChannel,
  } = input;

  const focusColumn = ancestors.length;
  const childColumn = focusColumn + 1;
  const channelColumnPresent = focus.object.hierarchyLevel === 3;
  const childLimit = input.childLimit ?? MAX_CHILD_OBJECT_NODES;

  const cells: Cell[] = [];
  const placed: Placed[] = [];
  const edges: GraphEdge[] = [];

  const link = (source: string, target: string) => edges.push({ id: GRAPH_ID.edge(source, target), source, target });
  const put = (item: Placed) => {
    cells.push({ column: item.column, row: item.row, kind: item.type });
    placed.push(item);
  };

  // Предки: по одному узлу на колонку (0..k-1), риск — тот же фолбэк, что и в списке.
  ancestors.forEach((ancestor, index) => {
    const risk = riskOfNode(ancestor);
    const id = GRAPH_ID.object(ancestor.id);
    put({
      id,
      type: "object",
      column: index,
      row: 0,
      data: { kind: "object", object: ancestor.object, risk, focused: false, detached: ancestor.detached },
      ariaLabel: objectAria(ancestor, risk),
    });
    if (index > 0) link(GRAPH_ID.object(ancestors[index - 1].id), id);
  });

  const focusId = GRAPH_ID.object(focus.id);
  const focusRisk = riskOfNode(focus);
  put({
    id: focusId,
    type: "object",
    column: focusColumn,
    row: 0,
    data: { kind: "object", object: focus.object, risk: focusRisk, focused: true, detached: focus.detached },
    ariaLabel: objectAria(focus, focusRisk),
  });
  if (ancestors.length > 0) link(GRAPH_ID.object(ancestors[ancestors.length - 1].id), focusId);

  let row = 0;

  // Дети-объекты: сервером не лимитированы, единственный потолок — локальный.
  const shownChildren = focus.children.slice(0, childLimit);
  for (const child of shownChildren) {
    const risk = riskOfNode(child);
    const id = GRAPH_ID.object(child.id);
    put({
      id,
      type: "object",
      column: childColumn,
      row,
      data: { kind: "object", object: child.object, risk, focused: false, detached: child.detached },
      ariaLabel: objectAria(child, risk),
    });
    link(focusId, id);
    row += 1;
  }

  const hiddenChildren = focus.children.length - shownChildren.length;
  if (hiddenChildren > 0) {
    put({
      id: GRAPH_ID.moreChildren,
      type: "aux",
      column: childColumn,
      row,
      data: { kind: "aux", aux: "more-children", count: hiddenChildren },
      ariaLabel: `Показать ещё детей: ${hiddenChildren}`,
    });
    link(focusId, GRAPH_ID.moreChildren);
    row += 1;
  }

  if (channelColumnPresent && channelState !== "off") {
    // Потолок каналов применяет страница (channelLimit в ObjectGraphPage) до вызова:
    // повторный slice здесь фиксировал бы лимит, и «Показать ещё» не срабатывал бы.
    const shown = channels;
    for (const channel of shown) {
      const risk = riskOfChannel?.(channel) ?? null;
      const predictionId = predictionOfChannel?.(channel) ?? null;
      const id = GRAPH_ID.channel(channel.id);
      put({
        id,
        type: "channel",
        column: childColumn,
        row,
        data: { kind: "channel", channel, risk, highlighted: channel.id === highlightChannel, predictionId },
        ariaLabel: channelAria(channel, risk, predictionId),
      });
      link(focusId, id);
      row += 1;
    }

    // Скрытые считаем от X-Total-Count; без счётчика остаётся hasMore последней страницы —
    // он в схеме required, и «страница не последняя» без числа тоже повод показать «+ ещё».
    const hidden = channelTotal === null ? null : Math.max(channelTotal - shown.length, 0);
    let aux: AuxKind | null = null;
    if (channelState === "loading" && shown.length === 0) aux = "channels-loading";
    else if (channelState === "error") aux = "channels-error";
    else if (channelState === "empty" && shown.length === 0) aux = "channels-empty";
    else if ((hidden ?? 0) > 0 || hasMoreChannels) aux = "more-channels";

    if (aux) {
      const id = aux === "more-channels" ? GRAPH_ID.moreChannels : GRAPH_ID.state(aux.replace("channels-", ""));
      put({
        id,
        type: "aux",
        column: childColumn,
        row,
        data: { kind: "aux", aux, count: aux === "more-channels" ? hidden : null },
        ariaLabel: aux === "more-channels" ? `Показать ещё каналы${hidden === null ? "" : `: ${hidden}`}` : aux,
      });
      link(focusId, id);
    }
  }

  const positions = layoutGraph(cells, focusColumn);
  const nodes: GraphNode[] = placed.map((item) => {
    const size = GRAPH_LAYOUT.size[item.type];
    return {
      ...item,
      position: positions.get(`${item.column}:${item.row}`) ?? { x: item.column * GRAPH_LAYOUT.columnStep, y: 0 },
      width: size.width,
      height: size.height,
    };
  });

  return {
    nodes,
    edges,
    channelColumnPresent,
    focusId,
    highlightedId:
      highlightChannel && nodes.some((n) => n.id === GRAPH_ID.channel(highlightChannel))
        ? GRAPH_ID.channel(highlightChannel)
        : null,
  };
}

/** Единственная граница с типами Vue Flow: здесь узлы получают флаги взаимодействия. */
export function toFlowNodes(graph: ObjectGraph): Node[] {
  return graph.nodes.map((item) => ({
    id: item.id,
    type: item.type,
    position: item.position,
    width: item.width,
    height: item.height,
    ariaLabel: item.ariaLabel,
    // Перетаскивание выключено и на <VueFlow>, и на узле: клавиатурный захват сдвинул бы
    // узел, а детерминированность макета — то, ради чего авто-раскладка не ставилась.
    draggable: false,
    selectable: false,
    data: item.data,
  }));
}

/**
 * Рёбра без `markerEnd`: цвет маркера — SVG-атрибут, `--el-*` в него не подставляется,
 * и в тёмной теме маркер остался бы светлым пятном. Направление читается из колонок.
 */
export function toFlowEdges(graph: ObjectGraph): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "smoothstep",
    animated: false,
    selectable: false,
    focusable: false,
  }));
}
