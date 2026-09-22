import { objectLabel } from "./label";
import type { InfrastructureObject, ObjectTreeNode, ObjectTree, ObjectTreeStats } from "../types";

/**
 * Построение дерева из ПЛОСКОЙ выдачи `/objects`.
 *
 * Инварианты важнее красоты, и они держатся пятью плоскими проходами без рекурсии:
 *
 * 1. **ни одна запись не потеряна** — дедуп по id (уникальность схемой не гарантирована,
 *    а `row-key` на дублях ведёт себя непредсказуемо: первая запись выигрывает),
 *    висячий `parentId` и разрыв цикла обоих переводят запись в корни с `detached: true`,
 *    а финальная страховка `countTreeNodes(roots) !== byId.size` докидывает недостающее;
 * 2. **цикл не подвешивает страницу** — обход состоянием `new|visiting|done` с внешним
 *    guard-счётчиком до `byId.size`, рекурсия по цепочке предков не нужна;
 * 3. **дерево не прыгает на рефетче** — дети и корни сортируются по `objectLabel()`
 *    (`localeCompare` с `"ru"`) и id, иначе порядок плывёт вместе с порядком выдачи.
 *
 * Функция чистая и ничего не мутирует: узлы-обёртки создаются здесь, `object` остаётся
 * ссылкой на запись из кэша Vue Query.
 */
export function buildObjectTree(items: InfrastructureObject[] | null | undefined): ObjectTree {
  const byId = new Map<string, ObjectTreeNode>();
  let received = 0;
  let duplicates = 0;
  let skipped = 0;

  // Проход 1 — дедупликация по id.
  for (const object of items ?? []) {
    if (!object || typeof object.id !== "string" || object.id === "") {
      skipped += 1;
      continue;
    }
    received += 1;
    if (byId.has(object.id)) {
      duplicates += 1;
      continue; // первая запись выигрывает
    }
    byId.set(object.id, {
      id: object.id,
      object,
      parentId: null,
      children: [],
      detached: false,
      depth: 0,
    });
  }

  if (skipped > 0) {
    console.warn(`[objects] ${skipped} записей без корректного id в дерево не попали (id обязателен по контракту)`);
  }

  // Проход 2 — разрешение parentId в «эффективного родителя».
  for (const node of byId.values()) {
    const parentId = node.object.parentId;
    if (parentId === null || parentId === undefined) continue;
    if (parentId === node.id) {
      node.detached = true; // самоссылка — цикл длины 1, обрывается сразу
      continue;
    }
    if (byId.has(parentId)) {
      node.parentId = parentId;
    } else {
      // Висячая ссылка: в выгрузке такое есть и «не чиним, отдаём как есть» (yaml:950-954),
      // но в дереве запись обязана стать корнем, а не исчезнуть.
      node.detached = true;
    }
  }

  // Проход 3 — итеративный разрыв циклов.
  const cycles = breakCycles(byId);

  // Проход 4 — сборка детей.
  const roots: ObjectTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId === null) roots.push(node);
    else byId.get(node.parentId)?.children.push(node);
  }

  // Страховка: если что-то выше всё же упустило запись, она уходит в корни, а не пропадает.
  const reached = collectReachable(roots);
  if (reached.size !== byId.size) {
    for (const node of byId.values()) {
      if (reached.has(node.id)) continue;
      console.warn(`[objects] узел ${node.id} не был достижим из корней — добавлен как осиротевший корень`);
      node.parentId = null;
      node.detached = true;
      roots.push(node);
    }
  }

  // Проход 5 — сортировка и глубина.
  const maxDepth = sortAndMeasure(roots);

  const detached = [...byId.values()].filter((node) => node.detached).length;
  const stats: ObjectTreeStats = {
    received,
    nodes: byId.size,
    duplicates,
    detached,
    cycles,
    maxDepth,
  };

  return { roots, byId, stats };
}

/**
 * Разрыв циклов обходом цепочек предков в состоянии `new|visiting|done`.
 * Возвращает число разорванных рёбер. Каждый узел остаётся в дереве ровно по одному разу:
 * в корень уходит голова цикла, остальные цепляются под неё.
 */
function breakCycles(byId: Map<string, ObjectTreeNode>): number {
  const state = new Map<string, "new" | "visiting" | "done">();
  let cycles = 0;

  for (const startId of byId.keys()) {
    if (state.get(startId) === "done") continue;

    const chain: string[] = [];
    let cursor: string | null = startId;
    let guard = 0;

    while (cursor !== null && guard <= byId.size) {
      guard += 1;
      const node = byId.get(cursor);
      if (!node) break;

      const mark = state.get(cursor) ?? "new";
      if (mark === "done") break; // хвост уже обработан в предыдущей цепочке и он ацикличен
      if (mark === "visiting") {
        // Вернулись в узел этой же цепочки — ребро, замыкающее цикл, обрывается здесь.
        node.parentId = null;
        node.detached = true;
        cycles += 1;
        break;
      }

      state.set(cursor, "visiting");
      chain.push(cursor);
      cursor = node.parentId;
    }

    for (const walked of chain) state.set(walked, "done");
  }

  return cycles;
}

function collectReachable(roots: ObjectTreeNode[]): Set<string> {
  const seen = new Set<string>();
  const stack = [...roots];
  while (stack.length > 0) {
    const node = stack.pop() as ObjectTreeNode;
    if (seen.has(node.id)) continue;
    seen.add(node.id);
    stack.push(...node.children);
  }
  return seen;
}

/** Сортировка корней и детей по подписи + id, простановка depth. Возвращает максимальную глубину. */
function sortAndMeasure(roots: ObjectTreeNode[]): number {
  roots.sort(compareNodes);

  let maxDepth = 0;
  const queue: { node: ObjectTreeNode; depth: number }[] = roots.map((node) => ({ node, depth: 0 }));
  let head = 0;

  while (head < queue.length) {
    const { node, depth } = queue[head];
    head += 1;

    node.depth = depth;
    if (depth > maxDepth) maxDepth = depth;

    node.children.sort(compareNodes);
    for (const child of node.children) queue.push({ node: child, depth: depth + 1 });
  }

  return maxDepth;
}

function compareNodes(a: ObjectTreeNode, b: ObjectTreeNode): number {
  const byLabel = objectLabel(a.object).localeCompare(objectLabel(b.object), "ru");
  if (byLabel !== 0) return byLabel;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Число узлов под данными корнями — страховка «ни одна запись не потеряна». */
export function countTreeNodes(roots: ObjectTreeNode[]): number {
  return collectReachable(roots).size;
}

/**
 * Цепочка предков `id` сверху вниз, БЕЗ самого узла. Узлы, а не записи: графу нужны
 * `detached` и разрешение риска по тому же правилу, что у списка.
 * Для висячего parentId или неизвестного id возвращает `[]` — граф тогда рисуется
 * без спинки предков, фокус один в верхнем ряду, это штатное состояние, а не ошибка.
 */
export function ancestorChain(byId: Map<string, ObjectTreeNode>, id: string): ObjectTreeNode[] {
  const path: ObjectTreeNode[] = [];
  const seen = new Set<string>([id]);
  let cursor = byId.get(id)?.parentId ?? null;
  let guard = 0;

  while (cursor !== null && guard <= byId.size) {
    guard += 1;
    if (seen.has(cursor)) break; // цикл не должен зациклить обход
    const node = byId.get(cursor);
    if (!node) break;
    seen.add(cursor);
    path.push(node);
    cursor = node.parentId;
  }

  return path.reverse();
}

/**
 * Фильтр дерева. Узел остаётся, если совпал сам ИЛИ если совпал кто-то из его потомков:
 * иначе поиск по имени листа рвал бы связь с его районом и дерево превращалось в плоский список.
 *
 * Возвращает СТРУКТУРНЫЕ копии (`{ ...node, children: [...] }`), `object` — ссылка на запись
 * из кэша Vue Query. Мутить кэш нельзя: он общий со страницей графа и карточкой дашборда.
 */
export function filterTree(roots: ObjectTreeNode[], matches: (node: ObjectTreeNode) => boolean): ObjectTreeNode[] {
  const order = preOrder(roots);
  if (order.length === 0) return [];

  const keep = new Map<string, boolean>();
  for (let i = order.length - 1; i >= 0; i -= 1) {
    const node = order[i];
    const childKept = node.children.some((child) => keep.get(child.id) === true);
    keep.set(node.id, matches(node) || childKept);
  }

  const copies = new Map<string, ObjectTreeNode>();
  const result: ObjectTreeNode[] = [];
  for (const node of order) {
    // Предок совпадения всегда помечен keep, поэтому копия находит себе родителя в этом же проходе.
    if (keep.get(node.id) !== true) continue;
    const copy: ObjectTreeNode = { ...node, children: [] };
    copies.set(node.id, copy);

    const parent = node.parentId === null ? undefined : copies.get(node.parentId);
    if (parent) parent.children.push(copy);
    else result.push(copy);
  }

  return result;
}

function preOrder(roots: ObjectTreeNode[]): ObjectTreeNode[] {
  const order: ObjectTreeNode[] = [];
  const stack = [...roots].reverse();
  while (stack.length > 0) {
    const node = stack.pop() as ObjectTreeNode;
    order.push(node);
    for (let i = node.children.length - 1; i >= 0; i -= 1) stack.push(node.children[i]);
  }
  return order;
}

/**
 * Ключи для `:expand-row-keys` — все узлы, у которых после фильтрации остались дети.
 *
 * МАСШТАБ. Сейчас раскрывается всё дерево, и это безобидно только при верхней границе
 * реестра в ~95 записей: ≤ 95 строк el-table с внутренним скроллом, ленивость не нужна.
 * Если реестр вырастет на порядок, «раскрыть всех с детьми» перестанет быть безопасным,
 * и вот три пути отступления — выбирать тогда, а не заранее:
 *
 * (а) раскрывать не всех с детьми, а только предков совпадений — при `q` это уже готовая
 *     семантика (`filterTree` сохраняет цепочку к совпадению);
 * (б) el-table в режиме `lazy` + `load` с серверной подгрузкой детей, если бэк добавит `?parentId=`;
 * (в) жёсткий потолок числа раскрытых узлов с видимой кнопкой «показать ещё».
 */
export function collectExpandableKeys(roots: ObjectTreeNode[]): string[] {
  return preOrder(roots)
    .filter((node) => node.children.length > 0)
    .map((node) => node.id);
}
