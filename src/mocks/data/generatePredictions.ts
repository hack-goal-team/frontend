// src/mocks/data/generatePredictions.ts
import type { Prediction, RiskLevel, PredictionStatus, TargetContext, Decision } from "@/modules/predictions/types";
import type { Channel } from "@/modules/channels/types";
import { mockLevel3Objects } from "./objects";
import { channelsOf } from "./channels";

// --- Справочники ---

// Коды типов — совпадают с /reference-data (mockReferenceData.incidentTypes)
const INCIDENT_TYPES = ["EQUIPMENT_FAILURE", "FIRE", "FLOOD", "GAS", "INTRUSION"] as const;

const TARGET_KINDS = ["COLLECTOR", "PUMP", "WELL", "SHAFT"] as const;

const MODEL_VERSIONS = ["v1.3.0", "v1.4.0", "v1.4.2", "v1.5.0"] as const;

// Коды причин — совпадают с /reference-data (mockReferenceData.reasons)
const REASON_CODES = ["WEATHER", "WEAR", "LOAD", "SENSOR", "OTHER"] as const;

const DECIDED_BY = ["dispatcher-01", "dispatcher-02", "dispatcher-03"] as const;

// --- PRNG ---

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

// --- Утилиты ---

function riskFromProbability(p: number): RiskLevel {
  if (p >= 0.7) return "HIGH";
  if (p >= 0.4) return "MEDIUM";
  return "LOW";
}

function isoAt(msOffsetFromNow: number): string {
  return new Date(Date.now() + msOffsetFromNow).toISOString();
}

// --- Генерация контекста ---

/**
 * Контекст — из реальных данных: случайный объект уровня 3 из реестра и (обычно) его канал.
 * Это то направление зависимости, которого требует контракт: прогноз приписывается к объекту
 * и каналу, а не наоборот. ~15% контекста пустые (прогнозы без цели), и ещё доля — с `objectId`,
 * но без `channelId`: так живыми остаются оба счётчика неатрибутированных прогнозов.
 * Объект без каналов (97) тоже возможен — тогда `channelId` всегда null.
 */
function generateContext(): TargetContext {
  const isEmpty = rand() < 0.15;

  if (isEmpty) {
    return {
      objectId: null,
      objectName: null,
      channelId: null,
      sensorName: null,
      sensorType: null,
      engineeringSystem: null,
    };
  }

  const object = pick(mockLevel3Objects);
  const channels = channelsOf(object.id);
  const channel: Channel | null = channels.length > 0 && rand() > 0.15 ? pick(channels) : null;

  return {
    objectId: object.id,
    objectName: object.name ?? `Объект ${object.id}`,
    channelId: channel?.id ?? null,
    sensorName: channel?.name ?? null,
    sensorType: channel?.sensorType ?? null,
    engineeringSystem: channel?.engineeringSystem ?? null,
  };
}

// --- Генерация решения ---

function generateDecision(predictionId: string, computedAt: string, horizonUntil: string): Decision {
  const reasonCode = pick(REASON_CODES);

  // decidedAt — между computedAt и horizonUntil
  // (в первой половине горизонта, чтобы решение было раньше инцидента)
  const computed = Date.parse(computedAt);
  const horizon = Date.parse(horizonUntil);
  const span = horizon - computed;
  const decidedOffset = Math.floor(rand() * span * 0.5);
  const decidedAt = new Date(computed + decidedOffset).toISOString();

  return {
    id: `prediction:${predictionId}:1`,
    target: { type: "PREDICTION", predictionId },
    reasonCode,
    comment: reasonCode === "OTHER" ? "Комментарий обязателен" : null,
    decidedBy: pick(DECIDED_BY),
    decidedAt,
  };
}

// --- Генерация прогнозов ---

export function generatePredictions(count = 500): Prediction[] {
  const items: Prediction[] = [];

  for (let i = 0; i < count; i++) {
    // --- probability ---
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

    // --- computedAt / horizonUntil ---
    const computedOffsetMs = -randInt(0, 24 * 60) * 60 * 1000;
    const computedAt = isoAt(computedOffsetMs);

    const horizonOffsetMs = computedOffsetMs + randInt(4 * 60, 24 * 60) * 60 * 1000;
    const horizonUntil = isoAt(horizonOffsetMs);

    // --- status ---
    const status: PredictionStatus = rand() < 0.3 ? "REVIEWED" : "NEW";

    // --- lastDecision: только у REVIEWED ---
    const id = String(1000 + i);
    const lastDecision = status === "REVIEWED" ? generateDecision(id, computedAt, horizonUntil) : null;

    // --- target ---
    const targetKind = pick(TARGET_KINDS);
    const targetRef = `${targetKind[0]}-${String(randInt(1, 99)).padStart(2, "0")}`;

    items.push({
      id,
      targetKind,
      targetRef,
      context: generateContext(),
      incidentType: pick(INCIDENT_TYPES),
      probability,
      riskLevel: riskFromProbability(probability),
      computedAt,
      horizonUntil,
      modelVersion: pick(MODEL_VERSIONS),
      status,
      lastDecision,
    });
  }

  // Сортировка по контракту: computedAt DESC, id DESC
  items.sort((a, b) => {
    if (a.computedAt !== b.computedAt) {
      return a.computedAt < b.computedAt ? 1 : -1;
    }
    return a.id < b.id ? 1 : -1;
  });

  return items;
}
