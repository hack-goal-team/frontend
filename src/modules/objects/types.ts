import type { RiskLevel } from "@/modules/predictions/types";

/**
 * Типы реестра объектов — строго по контракту реального бэкенда (OpenAPI v0,
 * схемы `InfrastructureObject` / `ObjectRisk`). Ничего сверх контракта не добавляем:
 * ручку `/objects/{id}` или граф-топологию бэк не обещает.
 */

/** 1 — район по эксплуатации, 2 — комплекс (каналов нет), 3 — объект с каналами. */
export type HierarchyLevel = 1 | 2 | 3;

export type ObjectKind = "district" | "controlHouse" | "guardObject";

/** Счётчики по уровням риска для узла subtree-агрегации; NONE — без активных прогнозов. */
export interface ObjectRiskCounts {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  NONE: number;
}

/**
 * Серверный риск объекта: `riskLevel` считает бэкенд по порогам из `/reference-data`
 * и уже сворачивает поддерево — фронту не пересчитывать (AGENTS.md).
 * `riskLevel: null` при присутствующем объекте `risk` — утверждение «активных прогнозов нет».
 */
export interface ObjectRisk {
  riskLevel: RiskLevel | null;
  riskCounts: ObjectRiskCounts;
  unreviewedPredictions: number;
}

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
  /**
   * Приходит только при `withRisk=true`. Отсутствие поля — «знания о риске нет»
   * (прочерк), а `riskLevel: null` внутри объекта — «прогнозов нет» (○): разные утверждения.
   */
  risk?: ObjectRisk | null;
}

export interface ObjectsQuery {
  /** Параметр в контракте есть; реестр его не шлёт — уровень это клиентская проекция дерева. */
  level?: HierarchyLevel;
  /** Риску реестра теперь есть откуда взяться — серверному; отдельный скан прогнозов не нужен. */
  withRisk?: boolean;
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

// ---- Риск для отрисовки ----

/**
 * Единая форма риска объекта и канала для таблиц, графа и полосы.
 * `null` — знания нет (поле `risk` не пришло): прочерк.
 * `level: null` — сервер утверждает, что активных прогнозов нет: ○ «без прогноза».
 * Сведений о полноте скана больше нет: риска «выведенного фронтом» тоже нет — источник один.
 */
export interface NodeRisk {
  level: RiskLevel | null;
}
