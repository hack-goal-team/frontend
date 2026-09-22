import type { Prediction, RiskLevel } from "@/modules/predictions/types";
import type { InfrastructureObject, NodeRisk, ObjectTreeNode, ObjectRisk, RiskCoverage, RiskSupport } from "../types";

/**
 * Реализован ли `withRisk` на сервисе.
 *
 * `risk` «in» объект — единственный различимый признак: если Java-сериализатор глотает null,
 * случаи «не реализовано» и «прогнозов нет» неразличимы. Поэтому при unsupported UI говорит
 * «Сведения о риске не приходят от сервиса», а не «риска нет» — второе было бы утверждением
 * о спокойной обстановке, которого у нас нет.
 *
 * Пустая выдача — "unknown": пустой массив ничего не доказывает (объектов может не быть
 * в области видимости), поэтому и вывод о поддержке делать нельзя.
 */
export function detectRiskSupport(items: InfrastructureObject[]): RiskSupport {
  if (items.length === 0) return "unknown";
  return items.some((item) => item && "risk" in item) ? "supported" : "unsupported";
}

// ---- Производный риск ----

/** Порядок «кто сильнее» нужен для свёртки; сравнение строк тут дало бы LOW > HIGH. */
export const RISK_RANK: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

export function maxRiskLevel(a: RiskLevel | null, b: RiskLevel | null): RiskLevel | null {
  if (!a) return b;
  if (!b) return a;
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b;
}

/** Сводка по активным прогнозам, привязанным к объекту (или каналу). */
export interface RiskAggregate {
  level: RiskLevel;
  activeCount: number;
  unreviewedCount: number;
}

export interface RiskMaps {
  /** Ключ — id объекта из `context.objectId`. */
  byObject: Map<string, RiskAggregate>;
  /** Ключ — id канала из `context.channelId`; уровень риска канала не сворачивается на объект повторно. */
  byChannel: Map<string, RiskAggregate>;
  /** Прогнозы, у которых `context.objectId` пуст: их нельзя никуда приписать (ADR-003). */
  unattributed: number;
}

function merge(target: Map<string, RiskAggregate>, key: string, prediction: Prediction): void {
  const current = target.get(key);
  const unreviewed = prediction.status === "NEW" ? 1 : 0;
  if (!current) {
    target.set(key, { level: prediction.riskLevel, activeCount: 1, unreviewedCount: unreviewed });
    return;
  }
  current.level = maxRiskLevel(current.level, prediction.riskLevel) as RiskLevel;
  current.activeCount += 1;
  current.unreviewedCount += unreviewed;
}

/**
 * Атрибуция риска — ТОЛЬКО через `context.objectId` / `context.channelId`.
 * `targetKind`/`targetRef` не парсим: формат `targetRef` контрактом не определён,
 * а догадываться о привязке прогноза к объекту хуже, чем признать `unattributed`.
 */
export function buildRiskMaps(predictions: Prediction[]): RiskMaps {
  const byObject = new Map<string, RiskAggregate>();
  const byChannel = new Map<string, RiskAggregate>();
  let unattributed = 0;

  for (const prediction of predictions) {
    const context = prediction?.context;
    if (!context) {
      unattributed += 1;
      continue;
    }
    if (context.objectId) merge(byObject, context.objectId, prediction);
    if (context.channelId) merge(byChannel, context.channelId, prediction);
    if (!context.objectId && !context.channelId) unattributed += 1;
  }

  return { byObject, byChannel, unattributed };
}

/**
 * Свёртка риска по поддереву. Обязательна: `/predictions?objectId=<район>` ничего не вернёт,
 * потому что прогноз привязан к уровню 3 / каналу, — риск района и комплекса существует только
 * как агрегат потомков. Итеративный пост-обход со стеком, рекурсии нет.
 */
export function rollUpRisks(roots: ObjectTreeNode[], own: Map<string, RiskAggregate>): Map<string, RiskAggregate> {
  const result = new Map<string, RiskAggregate>();
  if (roots.length === 0) return result;

  // пост-порядок: стек «узел + флаг детей», детей разбираем раньше родителя
  const order: ObjectTreeNode[] = [];
  const stack: ObjectTreeNode[] = [...roots];
  while (stack.length > 0) {
    const node = stack.pop() as ObjectTreeNode;
    order.push(node);
    stack.push(...node.children);
  }

  for (let i = order.length - 1; i >= 0; i -= 1) {
    const node = order[i];
    const ownValue = own.get(node.id);
    let aggregate: RiskAggregate | null = ownValue ? { ...ownValue } : null;

    for (const child of node.children) {
      const value = result.get(child.id);
      if (value) aggregate = combine(aggregate, value);
    }

    if (aggregate) result.set(node.id, aggregate);
  }

  return result;
}

function combine(a: RiskAggregate | null, b: RiskAggregate): RiskAggregate {
  if (!a) return { ...b };
  return {
    level: maxRiskLevel(a.level, b.level) as RiskLevel,
    activeCount: a.activeCount + b.activeCount,
    unreviewedCount: a.unreviewedCount + b.unreviewedCount,
  };
}

export interface ResolveRiskInput {
  /** Поле `risk` записи реестра: undefined — поля нет, null — пришёл null. */
  registryRisk?: ObjectRisk | null;
  support: RiskSupport;
  /** Свёрнутый по поддереву риск из скана активных прогнозов; undefined — объекта в карте нет. */
  derived?: RiskAggregate;
  /** Полнота скана: "none" — скана не было (ошибка/не запущен), "partial" — упёрся в стоп-кран. */
  coverage: RiskCoverage;
}

/**
 * ЕДИНСТВЕННОЕ место, где решается, что диспетчер видит в колонке риска.
 * Формулировка таблицы — закон, правки только здесь:
 *
 * | ситуация                                   | результат                                        | UI                                        |
 * |---------------------------------------------|--------------------------------------------------|-------------------------------------------|
 * | `risk` пришло объектом                       | `{ level, source: "registry" }`                   | тег риска, без сноски                      |
 * | `risk: { riskLevel: null }`                  | `{ level: null, source: "registry" }`             | ○ «без прогноза» — это утверждение бэка    |
 * | поля `risk` нет, производный есть            | `{ level, source: "derived", derived: true }`     | тот же цвет + сноска «выведено из прогнозов»|
 * | поля нет, скан завершён, объекта в карте нет | `{ level: null, coverage: "complete" }`           | ○ «без прогноза»                           |
 * | поля нет, скан обрезан стоп-краном          | `{ coverage: "partial" }`                         | нейтрально, НИКОГДА не ○                   |
 * | ни реестра, ни скана                        | `null`                                            | «—» и подпись «нет данных»                 |
 *
 * Последние две строки — смысл `coverage`: «мы не знаем» и «риска нет» обязаны
 * выглядеть по-разному, иначе неполнота будет выдана диспетчеру за спокойную картину.
 */
export function resolveRisk(input: ResolveRiskInput): NodeRisk | null {
  const { registryRisk, support, derived, coverage } = input;

  if (support === "supported" && registryRisk) {
    return {
      level: registryRisk.riskLevel,
      source: "registry",
      derived: false,
      coverage: "complete",
      activeCount: registryRisk.activePredictions,
      unreviewedCount: registryRisk.unreviewedPredictions,
    };
  }

  if (coverage === "none") return null;

  if (derived) {
    return {
      level: derived.level,
      source: "derived",
      derived: true,
      coverage,
      activeCount: derived.activeCount,
      unreviewedCount: derived.unreviewedCount,
    };
  }

  return {
    level: null,
    source: "derived",
    derived: true,
    coverage,
    activeCount: 0,
    unreviewedCount: 0,
  };
}
