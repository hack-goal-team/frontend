// src/mocks/data/generatePredictions.ts
import type {
  Prediction,
  PredictionReason,
  PredictionStatus,
  TargetContext,
  Decision,
  SensorState,
} from "@/modules/predictions/types";
import type { Channel } from "@/modules/channels/types";
import { riskOf } from "../lib/riskLevel";
import { incidentClassOf } from "../lib/incidentClass";
import { mockLevel3Objects } from "./objects";
import { channelsOf } from "./channels";

// --- Справочники ---

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
      incidentClass: null,
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
    incidentClass: incidentClassOf(channel?.sensorType),
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

// --- Генерация факторов прогноза (reasons) ---

// Пул из живого ответа /predictions/{id}: контракт не перечисляет конкретные факторы,
// мок воспроизводит реальный набор, а не выдуманную таксономию.
const REASON_POOL: Omit<PredictionReason, "direction" | "contribution">[] = [
  { factor: "Тип датчика", feature: "тип_датчика", group: "STATIC", value: "КД АВ" },
  { factor: "Тег инженерной системы", feature: "тег_инженерной_системы", group: "STATIC", value: "645" },
  { factor: "«Не замкнут» за 1 ч", feature: "value_cat__Не замкнут__sum_1h", group: "SENSOR_HISTORY", value: 2 },
  { factor: "«Норма» за 1 ч", feature: "value_cat__Норма__sum_1h", group: "SENSOR_HISTORY", value: 3 },
  { factor: "«Норма» за 3 сут", feature: "value_cat__Норма__sum_3d", group: "SENSOR_HISTORY", value: 3 },
  { factor: "Среднее показание за 2 сут", feature: "value_float__mean_2d", group: "SENSOR_HISTORY", value: null },
  { factor: "День недели", feature: "day_of_week", group: "CALENDAR", value: 6 },
  { factor: "Давление через 16 ч", feature: "pressure_msl (hPa)__future_16h", group: "WEATHER", value: 1029.2 },
  { factor: "Температура через 1 сут", feature: "temp_c (°C)__future_1d", group: "WEATHER", value: -3.4 },
];

/**
 * Первый фактор объясняет бо́льшую часть вероятности, остальные — затухающий вклад.
 * 75% побочных факторов толкуют риск вниз — как в живых ответах.
 */
function generateReasons(probability: number): PredictionReason[] {
  const indices = REASON_POOL.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const count = randInt(5, 8);
  return indices.slice(0, count).map((poolIndex, position) => {
    const template = REASON_POOL[poolIndex];
    const magnitude = position === 0 ? probability * (0.5 + rand() * 0.4) : 0.02 * rand() ** 2;
    const negative = position !== 0 && rand() < 0.25;
    const contribution = negative ? -magnitude : magnitude;
    return { ...template, contribution, direction: contribution >= 0 ? "UP" : "DOWN" };
  });
}

// --- Текущее состояние датчика (currentState / lastAlarmAt) ---

// Высоковероятный прогноз чаще «уже горит»: событие предсказывали, оно наступило.
// Небольшая доля состояний устаревшая — датчик давно не выходил на связь.
function generateCurrentState(probability: number): SensorState {
  const alarming = probability >= 0.7 ? rand() < 0.55 : rand() < 0.08;
  const outdated = !alarming && rand() < 0.05;

  const staleMs = outdated ? randInt(2, 24) * 60 * 60 * 1000 : 0;

  return {
    value: alarming ? pick(["Не замкнут", "Неисправен"] as const) : "Норма",
    observedAt: isoAt(-(randInt(0, 20) * 60 * 1000 + staleMs)),
    alarming,
    outdated,
  };
}

function generateLastAlarmAt(alarming: boolean): string | null {
  // При alarming авария раньше свежего показания: observedAt — не старше 20 мин
  if (alarming) return isoAt(-randInt(25, 120) * 60 * 1000);
  return rand() < 0.4 ? isoAt(-randInt(1, 72) * 60 * 60 * 1000) : null;
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
    const statusRoll = rand();
    const status: PredictionStatus = statusRoll < 0.1 ? "COVERED" : statusRoll < 0.35 ? "REVIEWED" : "NEW";

    // --- lastDecision: только у REVIEWED ---
    const id = String(1000 + i);
    const lastDecision = status === "REVIEWED" ? generateDecision(id, computedAt, horizonUntil) : null;

    // --- target ---
    const targetKind = pick(TARGET_KINDS);
    const targetRef = `${targetKind[0]}-${String(randInt(1, 99)).padStart(2, "0")}`;

    // --- currentState / lastAlarmAt ---
    const currentState = generateCurrentState(probability);

    // Две модели пишут в один журнал: 4-классовая — только по каналу с классом и ровно этим
    // классом, модель отказов (EQUIPMENT_FAILURE) — по любому датчику.
    const context = generateContext();
    const incidentClass = context.incidentClass;
    const isEquipment = !incidentClass || rand() < 0.3;
    const incidentType = incidentClass && !isEquipment ? incidentClass.code : "EQUIPMENT_FAILURE";

    items.push({
      id,
      targetKind,
      targetRef,
      context,
      incidentType,
      kind: isEquipment ? "EQUIPMENT" : "INCIDENT",
      probability,
      riskLevel: riskOf(isEquipment ? "EQUIPMENT" : "INCIDENT", probability),
      computedAt,
      horizonUntil,
      modelVersion: pick(MODEL_VERSIONS),
      status,
      lastDecision,
      reasons: generateReasons(probability),
      currentState,
      lastAlarmAt: generateLastAlarmAt(currentState.alarming),
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
