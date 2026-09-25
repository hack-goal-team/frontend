import type { RiskLevel } from "@/modules/predictions/types";

/**
 * Типы реестра объектов — строго по контракту реального бэкенда (OpenAPI v0,
 * схемы `InfrastructureObject`). Ничего сверх контракта не добавляем:
 * ручку `/objects/{id}` или граф-топологию бэк не обещает.
 */

/** 1 — район по эксплуатации, 2 — комплекс (каналов нет), 3 — объект с каналами. */
export type HierarchyLevel = 1 | 2 | 3;

export type ObjectKind = "district" | "controlHouse" | "guardObject";

export interface InfrastructureObject {
  /** bigint строкой: Number теряет точность после 2^53 (AGENTS.md). */
  id: string;
  /** Может ссылаться на объект вне реестра — «не чиним, отдаём как есть». */
  parentId: string | null;
  hierarchyLevel: HierarchyLevel;
  kind: ObjectKind;
  /** nullable → фолбэк «Объект #<id>», см. lib/label.ts */
  name: string | null;
  snapshotAt: string;
}

export interface ObjectsQuery {
  /** Параметр в контракте есть; реестр его не шлёт — уровень это клиентская проекция дерева. */
  level?: HierarchyLevel;
}

export interface ObjectRegistryPage {
  items: InfrastructureObject[];
  /** null — заголовка X-Total-Count нет или он не число; 0 — легитимный ноль. */
  total: number | null;
}

// ---- Дерево ----

export interface ObjectTreeNode {
  id: string;
  object: InfrastructureObject;
  /**
   * Родитель, найденный в ЭТОЙ выдаче. Висячий parentId даёт null: на уровне 1 это
   * штатный корень (родитель лежит вне реестра), ниже — detached === true, запись
   * показывает себя как корень, но помнит об этом.
   */
  parentId: string | null;
  children: ObjectTreeNode[];
  /** true, если запись стала корнем из-за отсутствия родителя в выдаче (ниже уровня 1) или разрыва цикла. */
  detached: boolean;
  depth: number;
}

export interface ObjectTreeStats {
  /** Записей в ответе, до дедупликации. */
  received: number;
  /** Уникальных id после дедупликации — столько же узлов в дереве. */
  nodes: number;
  duplicates: number;
  /** Корней, появившихся из висячего parentId ниже первого уровня или из разрыва цикла. */
  detached: number;
  cycles: number;
  maxDepth: number;
}

export interface ObjectTree {
  roots: ObjectTreeNode[];
  /** Индекс по id покрывает ВСЕ принятые записи, включая осиротевшие. */
  byId: Map<string, ObjectTreeNode>;
  stats: ObjectTreeStats;
}

// ---- Риск ----

/**
 * Полнота знания о риске. Нужна, чтобы «мы не доглядели» не выглядело как
 * «всё спокойно»: level: null при coverage: "partial" рисуется нейтрально, а не как ○ «без прогноза».
 */
export type RiskCoverage = "complete" | "partial" | "none";

export interface NodeRisk {
  level: RiskLevel | null;
  coverage: RiskCoverage;
  activeCount: number;
  unreviewedCount: number;
  /**
   * Есть прогнозы, которые скан не смог приписать этой цели. При таком ○ «без прогноза»
   * было бы ложной уверенностью: прогноз существует, просто не сворачивается сюда.
   */
  hasUnattributed: boolean;
}
