import type { RiskLevel } from "@/modules/predictions/types";

/**
 * Типы реестра объектов — строго по `docs/openapi-frontend.yaml` v0.2.0
 * (схемы `InfrastructureObject`, `ObjectRisk`). Ничего сверх контракта не добавляем:
 * ручку `/objects/{id}` или граф-топологию бэк не обещает.
 */

/** 1 — район по эксплуатации, 2 — комплекс (каналов нет), 3 — объект с каналами. */
export type HierarchyLevel = 1 | 2 | 3;

export type ObjectKind = "district" | "controlHouse" | "guardObject";

export interface ObjectRisk {
  /**
   * null — это утверждение бэка «актуальных прогнозов нет», и оно НЕ то же самое,
   * что «поля risk в ответе нет» (см. RiskSupport).
   */
  riskLevel: RiskLevel | null;
  activePredictions: number;
  unreviewedPredictions: number;
}

export interface InfrastructureObject {
  /** bigint строкой: Number теряет точность после 2^53 (AGENTS.md). */
  id: string;
  /** Может ссылаться на объект вне реестра — «не чиним, отдаём как есть» (yaml:950-954). */
  parentId: string | null;
  hierarchyLevel: HierarchyLevel;
  kind: ObjectKind;
  /** nullable → фолбэк «Объект #<id>», см. lib/label.ts */
  name: string | null;
  snapshotAt: string;
  /** Не в required: отсутствует / null / число — три разных случая. */
  channelCount?: number | null;
  /** Присутствует только при withRisk=true; бэк его ещё не реализовал. */
  risk?: ObjectRisk | null;
}

export interface ObjectsQuery {
  level?: HierarchyLevel;
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
   * Родитель, найденный в ЭТОЙ выдаче. Висячий parentId даёт null, и тогда
   * detached === true — запись показывает себя как корень, но помнит об этом.
   */
  parentId: string | null;
  children: ObjectTreeNode[];
  /** true, если запись стала корнем не потому, что она верхнего уровня, а потому, что родителя нет в выдаче или разорван цикл. */
  detached: boolean;
  depth: number;
}

export interface ObjectTreeStats {
  /** Записей в ответе, до дедупликации. */
  received: number;
  /** Уникальных id после дедупликации — столько же узлов в дереве. */
  nodes: number;
  duplicates: number;
  /** Корней, появившихся из висячего parentId или из разрыва цикла. */
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
 * Поддержка risk реестром. "unknown" на пустой выдаче: пустой массив ничего не
 * доказывает — возможно, объектов просто нет в области видимости.
 */
export type RiskSupport = "supported" | "unsupported" | "unknown";

export type RiskSource = "registry" | "derived" | "unavailable";

/**
 * Полнота знания о риске. Нужна, чтобы «мы не доглядели» не выглядело как
 * «всё спокойно»: level: null при coverage: "partial" рисуется нейтрально, а не как ○ «без прогноза».
 */
export type RiskCoverage = "complete" | "partial" | "none";

export interface NodeRisk {
  level: RiskLevel | null;
  source: RiskSource;
  /** true, если уровень выведен из активных прогнозов, а не прислан реестром. */
  derived: boolean;
  coverage: RiskCoverage;
  activeCount: number;
  unreviewedCount: number;
  /**
   * Есть прогнозы, которые скан не смог приписать этой цели. При таком ○ «без прогноза»
   * было бы ложной уверенностью: прогноз существует, просто не сворачивается сюда.
   */
  hasUnattributed: boolean;
}
