import type { Edge, Node } from "@vue-flow/core";
import type { Channel } from "@/modules/channels/types";
import { RISK_LABEL } from "@/modules/predictions/consts";
import { CHANNEL_NODE_LIMIT, MAX_CHILD_OBJECT_NODES, UNKNOWN_VALUE } from "../consts";
import { objectLabel } from "./label";
import type { NodeRisk, ObjectTreeNode } from "../types";

/**
 * Проекция «предки сверху → фокус → дети/каналы внизу» и детерминированный макет.
 *
 * Ориентация вертикальная: иерархия читается сверху вниз (район → комплекс → объект), а
 * однородные узлы одного уровня стоят в один ряд по горизонтали, в порядке выдачи.
 *
 * Рёбра выводятся ровно из двух отношений контракта: `InfrastructureObject.parentId`
 * (иерархия) и `Channel.objectId` (владение каналом). Топологии потока здесь нет — ребро
 * «участок → участок» было бы выдумкой, весь смысл названия раздела («Иерархия объекта»).
 *
 * Порядок каналов — «как пришло», позиция = индекс в конкатенации страниц. Соседство узлов
 * НЕ утверждает соседства на трассе: ORDER BY на `/channels` контрактом не обещан. Отсюда же
 * запрет сортировать каналы и детей по риску — сортировка закодировала бы ложное
 * «проблемный канал идёт следующим по трассе».
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
 * Ориентация вертикальная: глубина иерархии идёт по y (`levelStep`), однородный уровень
 * разворачивается по x шагом `siblingStep` и переносится, как текст — не более
 * `nodesPerLine` узлов на строку (`lineStep` — высота строки).
 *
 * Перенос обязателен: без него объект с 30 каналами дал бы ленту шириной ~8700px, `fitView`
 * упёрся бы в `minZoom`, и экран выглядел бы сломанным. 6 в строку — 1680px, то есть кадр
 * типового монитора диспетчерской без учёта сайдбара.
 *
 * Размеры узлов заданы числами здесь, а не измеряются из DOM: координаты считаются
 * до первого кадра, и плавающая высота сдвигала бы фокус на каждой перерисовке.
 */
export const GRAPH_LAYOUT = {
  levelStep: 200,
  siblingStep: 280,
  lineStep: 96,
  nodesPerLine: 6,
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
  /** Глубина от корня: 0..k-1 предки, k фокус, k+1 дети и каналы. По этой оси идёт y. */
  level: number;
  /** Порядок внутри уровня — он же x: дети и каналы разложены слева направо. */
  slot: number;
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
  /** false у уровня 2: каналов по контракту нет, и строки «нет данных» для него тоже нет. */
  channelRowPresent: boolean;
  focusId: string;
  /** id узла подсветки, только если канал реально отрисован. */
  highlightedId: string | null;
}

/** "off" — источника каналов ещё нет (инкремент до подключения `/channels`). */
export type ChannelRowState = "off" | "loading" | "error" | "empty" | "ready";

export interface BuildGraphInput {
  focus: ObjectTreeNode;
  /** От корня к фокусу; `[]` — родитель в выдаче не найден (осиротевшая запись либо 404-подобный случай). */
  ancestors: ObjectTreeNode[];
  /** Каналы в порядке выдачи; обрезку по лимиту делает эта функция. */
  channels: Channel[];
  channelState: ChannelRowState;
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
  if (!risk.level) return "активных прогнозов нет";
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

type Cell = { level: number; slot: number; kind: GraphKind };
type Placed = Omit<GraphNode, "position" | "width" | "height">;

/**
 * Координаты из глубины (y: предки → фокус → дети) и порядка внутри уровня (x).
 * Фокус центрирован по блоку следующего уровня, предки стоят на одной вертикали с ним —
 * цепочка «район → комплекс → объект» читается сверху вниз одной линией.
 *
 * `position` в Vue Flow — верхний левый угол, поэтому центровка считает ЦЕНТР блока
 * (`(строки - 1) * siblingStep / 2 + ширина / 2`) и вычитает половину ширины своего узла.
 * Ошибка «считаем левые углы» — расцентровка на полузла.
 *
 * Строка уровня выравнивается по центру блока, а не по левому краю: последняя, неполная строка
 * на 60 каналах иначе уехала бы влево и фокус «смотрел» бы не в середину, а в угол.
 *
 * Ширина блока берётся от ПЕРВОГО узла следующего уровня: в смешанном уровне (объекты +
 * «+ ещё») возможен сдвиг на полузла. Это косметика, а не ошибка — вид центрируется по
 * однотипным уровням (каналы), а смешанные всегда короче лимита и влезают в кадр.
 */
export function layoutGraph(cells: Cell[], focusLevel: number): Map<string, { x: number; y: number }> {
  const nextLevel = focusLevel + 1;
  let slots = 0;
  let blockKind: GraphKind | null = null;

  for (const cell of cells) {
    if (cell.level !== nextLevel) continue;
    if (cell.slot + 1 > slots) slots = cell.slot + 1;
    blockKind ??= cell.kind;
  }

  const { levelStep, siblingStep, lineStep, nodesPerLine, size } = GRAPH_LAYOUT;
  // Узлов на строку: хотя бы один, иначе на пустом уровне blockSpan уедет в минус на целый шаг.
  const perLine = Math.max(Math.min(slots, nodesPerLine), 1);
  const blockSpan = (perLine - 1) * siblingStep;
  const blockCenter = blockSpan / 2 + size[blockKind ?? "object"].width / 2;
  const sharedX = blockCenter - size.object.width / 2;

  const positions = new Map<string, { x: number; y: number }>();
  for (const cell of cells) {
    if (cell.level !== nextLevel) {
      positions.set(`${cell.level}:${cell.slot}`, { x: sharedX, y: cell.level * levelStep });
      continue;
    }
    const line = Math.floor(cell.slot / nodesPerLine);
    const inLine = Math.min(slots - line * nodesPerLine, nodesPerLine);
    const width = size[cell.kind].width;
    const step = cell.slot % nodesPerLine;
    // Первый узел строки: центр строки совпадает с центром блока, от него — назад на полшага
    // за каждого соседа и на половину своей ширины (position — левый верхний угол).
    const firstLeft = blockCenter - ((inLine - 1) * siblingStep) / 2 - width / 2;

    positions.set(`${cell.level}:${cell.slot}`, {
      x: firstLeft + step * siblingStep,
      y: cell.level * levelStep + line * lineStep,
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

  const focusLevel = ancestors.length;
  const childLevel = focusLevel + 1;
  const channelRowPresent = focus.object.hierarchyLevel === 3;
  const childLimit = input.childLimit ?? MAX_CHILD_OBJECT_NODES;

  const cells: Cell[] = [];
  const placed: Placed[] = [];
  const edges: GraphEdge[] = [];

  const link = (source: string, target: string) => edges.push({ id: GRAPH_ID.edge(source, target), source, target });
  const put = (item: Placed) => {
    cells.push({ level: item.level, slot: item.slot, kind: item.type });
    placed.push(item);
  };

  // Предки: по одному узлу на уровень (0..k-1) на одной вертикали с фокусом.
  ancestors.forEach((ancestor, index) => {
    const risk = riskOfNode(ancestor);
    const id = GRAPH_ID.object(ancestor.id);
    put({
      id,
      type: "object",
      level: index,
      slot: 0,
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
    level: focusLevel,
    slot: 0,
    data: { kind: "object", object: focus.object, risk: focusRisk, focused: true, detached: focus.detached },
    ariaLabel: objectAria(focus, focusRisk),
  });
  if (ancestors.length > 0) link(GRAPH_ID.object(ancestors[ancestors.length - 1].id), focusId);

  let slot = 0;

  // Дети-объекты: сервером не лимитированы, единственный потолок — локальный.
  const shownChildren = focus.children.slice(0, childLimit);
  for (const child of shownChildren) {
    const risk = riskOfNode(child);
    const id = GRAPH_ID.object(child.id);
    put({
      id,
      type: "object",
      level: childLevel,
      slot,
      data: { kind: "object", object: child.object, risk, focused: false, detached: child.detached },
      ariaLabel: objectAria(child, risk),
    });
    link(focusId, id);
    slot += 1;
  }

  const hiddenChildren = focus.children.length - shownChildren.length;
  if (hiddenChildren > 0) {
    put({
      id: GRAPH_ID.moreChildren,
      type: "aux",
      level: childLevel,
      slot,
      data: { kind: "aux", aux: "more-children", count: hiddenChildren },
      ariaLabel: `Показать ещё детей: ${hiddenChildren}`,
    });
    link(focusId, GRAPH_ID.moreChildren);
    slot += 1;
  }

  if (channelRowPresent && channelState !== "off") {
    const shown = channels.slice(0, CHANNEL_NODE_LIMIT);
    for (const channel of shown) {
      const risk = riskOfChannel?.(channel) ?? null;
      const predictionId = predictionOfChannel?.(channel) ?? null;
      const id = GRAPH_ID.channel(channel.id);
      put({
        id,
        type: "channel",
        level: childLevel,
        slot,
        data: {
          kind: "channel",
          channel,
          risk,
          highlighted: channel.id === highlightChannel,
          predictionId,
        },
        ariaLabel: channelAria(channel, risk, predictionId),
      });
      link(focusId, id);
      slot += 1;
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
        level: childLevel,
        slot,
        data: { kind: "aux", aux, count: aux === "more-channels" ? hidden : null },
        ariaLabel: aux === "more-channels" ? `Показать ещё каналы${hidden === null ? "" : `: ${hidden}`}` : aux,
      });
      link(focusId, id);
    }
  }

  const positions = layoutGraph(cells, focusLevel);
  const nodes: GraphNode[] = placed.map((item) => {
    const size = GRAPH_LAYOUT.size[item.type];
    return {
      ...item,
      position: positions.get(`${item.level}:${item.slot}`) ?? { x: 0, y: item.level * GRAPH_LAYOUT.levelStep },
      width: size.width,
      height: size.height,
    };
  });

  return {
    nodes,
    edges,
    channelRowPresent,
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
