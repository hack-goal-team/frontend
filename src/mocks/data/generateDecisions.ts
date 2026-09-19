import type { Decision, Prediction } from "@/modules/predictions/types";

const ACTION_CODES = ["INSPECT", "PUMP_DOWN", "REPAIR", "MONITOR"] as const;
const REASON_CODES = ["WEATHER", "WEAR", "LOAD", "SENSOR", "OTHER"] as const;
const DECIDED_BY = ["dispatcher-01", "dispatcher-02", "dispatcher-03"] as const;

/**
 * Детерминированный PRNG — данные стабильны между перезагрузками.
 * Другой seed, чтобы не совпадать с генератором прогнозов.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Генерирует решения для прогноза.
 * Если status === 'NEW' — пусто.
 * Если status === 'REVIEWED' — 1..3 решения.
 */
export function generateDecisionsForPrediction(prediction: Prediction): Decision[] {
  if (prediction.status === "NEW") return [];

  const seed = parseInt(prediction.id, 10) + 7;
  const rand = mulberry32(seed);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
  const count = 1 + Math.floor(rand() * 3); // 1..3
  const decisions: Decision[] = [];

  for (let i = 0; i < count; i++) {
    const actionCode = pick(ACTION_CODES);
    const reasonCode = pick(REASON_CODES);

    // decidedAt — между computedAt и horizonUntil (сдвиг вперёд)
    const computed = Date.parse(prediction.computedAt);
    const horizon = Date.parse(prediction.horizonUntil);
    const span = horizon - computed;
    const decidedOffset = Math.floor(rand() * span * 0.5); // в первой половине горизонта
    const decidedAt = new Date(computed + decidedOffset).toISOString();

    decisions.push({
      id: `prediction:${prediction.id}:${i + 1}`,
      target: { type: "PREDICTION", predictionId: prediction.id },
      actionCode,
      reasonCode,
      comment: reasonCode === "OTHER" ? "Комментарий обязателен" : null,
      decidedBy: pick(DECIDED_BY),
      decidedAt,
    });
  }

  // Сортировка по decidedAt DESC (свежие сверху)
  return decisions.sort((a, b) => (a.decidedAt < b.decidedAt ? 1 : -1));
}
