import type { Prediction, RiskLevel, PredictionStatus } from "@/modules/predictions/types";

// ---- Справочные значения (совпадают с /reference-data) ----

const INCIDENT_TYPES = ["FLOODING", "OVERHEAT", "FAILURE", "PRESSURE_DROP", "LEAK", "POWER_OUTAGE"] as const;

const TARGET_KINDS = ["COLLECTOR", "PUMP", "WELL", "SHAFT"] as const;

const MODEL_VERSIONS = ["v1.3.0", "v1.4.0", "v1.4.2", "v1.5.0"] as const;

// ---- Хелперы ----

/** Детерминированный PRNG (mulberry32) — данные стабильны между перезапусками. */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(42);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number): number => Math.floor(rand() * (max - min + 1)) + min;

/** Риск выводим из вероятности — согласовано с riskThresholds. */
function riskFromProbability(p: number): RiskLevel {
  if (p >= 0.7) return "HIGH";
  if (p >= 0.4) return "MEDIUM";
  return "LOW";
}

/** ISO-строка в UTC. */
function isoAt(msOffsetFromNow: number): string {
  return new Date(Date.now() + msOffsetFromNow).toISOString();
}

// ---- Генерация ----

export function generatePredictions(count = 500): Prediction[] {
  const items: Prediction[] = [];

  for (let i = 0; i < count; i++) {
    // Вероятность с бимодальным распределением — больше HIGH и LOW, меньше MEDIUM.
    // Так интереснее смотреть фильтры.
    const roll = rand();
    let probability: number;
    if (roll < 0.35) {
      probability = 0.7 + rand() * 0.3; // HIGH: 0.70..1.00
    } else if (roll < 0.65) {
      probability = 0.4 + rand() * 0.3; // MEDIUM: 0.40..0.70
    } else {
      probability = 0.05 + rand() * 0.35; // LOW: 0.05..0.40
    }
    probability = Math.round(probability * 100) / 100;

    // computedAt — за последние 7 дней, равномерно.
    const computedOffsetMs = -randInt(0, 7 * 24 * 60) * 60 * 1000;
    const computedAt = isoAt(computedOffsetMs);

    // horizonUntil — computedAt + 4..24 часа.
    const horizonOffsetMs = computedOffsetMs + randInt(4 * 60, 24 * 60) * 60 * 1000;
    const horizonUntil = isoAt(horizonOffsetMs);

    // status: ~30% REVIEWED, чтобы фильтр по статусу был заметен.
    const status: PredictionStatus = rand() < 0.3 ? "REVIEWED" : "NEW";

    const targetKind = pick(TARGET_KINDS);
    const targetRef = `${targetKind[0]}-${String(randInt(1, 99)).padStart(2, "0")}`;

    items.push({
      id: String(1000 + i),
      targetKind,
      targetRef,
      incidentType: pick(INCIDENT_TYPES),
      probability,
      riskLevel: riskFromProbability(probability),
      computedAt,
      horizonUntil,
      modelVersion: pick(MODEL_VERSIONS),
      status,
    });
  }

  // Сортировка по контракту: computedAt DESC, id DESC.
  items.sort((a, b) => {
    if (a.computedAt !== b.computedAt) {
      return a.computedAt < b.computedAt ? 1 : -1;
    }
    return a.id < b.id ? 1 : -1;
  });

  return items;
}
