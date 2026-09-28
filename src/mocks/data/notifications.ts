import type { Prediction, PredictionPage } from "@/modules/predictions/types";
import { mockPredictions } from "./predictions";
import { channelsOf } from "./channels";
import { mockLevel3Objects } from "./objects";
import { sortPredictions } from "../lib/sortPredictions";
import { riskOf } from "../lib/riskLevel";
import { incidentClassOf } from "../lib/incidentClass";

// Мутабельная копия — мок меняет её, чтобы имитировать новые прогнозы
let livePredictions: Prediction[] = [...mockPredictions];

let nextId = 10000;

/** Живой журнал: моки /dashboard и /predictions должны видеть порождённые SSE-прогнозы. */
export function getLivePredictions(): Prediction[] {
  return livePredictions;
}

/**
 * Только инциденты: риск графа и SSE по контракту не видят модель отказов — её вероятность
 * несопоставима с инцидентной и срочности не несёт. Сводка по-прежнему смешивает виды.
 */
export function getLiveIncidents(): Prediction[] {
  return livePredictions.filter((p) => p.kind === "INCIDENT");
}

/**
 * Админ поменял пороги риска — уровни живой журнала пересчитываются, как на бэке,
 * где `riskLevel` не хранится, а считается на чтении по порогам из `/reference-data`.
 */
export function recomputeRiskLevels(): void {
  for (const prediction of livePredictions) {
    prediction.riskLevel = riskOf(prediction.kind, prediction.probability);
  }
}

/**
 * Имитирует появление нового критического прогноза.
 * Вызывается по таймеру из SSE-хендлера.
 *
 * Объект и канал — реальные: прогноз обязан перекрашивать существующий узел графа,
 * а не пустоту.
 */
export function spawnCriticalPrediction(): Prediction {
  const now = new Date();
  const horizon = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  // Модель инцидентов считает только каналы с классом — берём объект, где такой канал есть.
  const candidates = mockLevel3Objects.flatMap((o) =>
    channelsOf(o.id)
      .filter((c) => incidentClassOf(c.sensorType))
      .map((c) => ({ object: o, channel: c })),
  );
  const { object, channel } = candidates[Math.floor(Math.random() * candidates.length)];

  // Критический «живой» прогноз чаще всего уже горит — так панель показывает баннер аварии
  const alarming = Math.random() < 0.7;

  const p: Prediction = {
    id: String(nextId++),
    targetKind: "channel",
    targetRef: `channel/${channel?.id ?? object.id}`,
    context: {
      objectId: object.id,
      objectName: object.name ?? `Объект ${object.id}`,
      channelId: channel?.id ?? null,
      sensorName: channel?.name ?? null,
      sensorType: channel?.sensorType ?? null,
      engineeringSystem: channel?.engineeringSystem ?? null,
      incidentClass: incidentClassOf(channel?.sensorType),
    },
    incidentType: incidentClassOf(channel.sensorType)?.code ?? "FLOOD",
    kind: "INCIDENT",
    probability: 0.85 + Math.random() * 0.15,
    riskLevel: "HIGH",
    computedAt: now.toISOString(),
    horizonUntil: horizon.toISOString(),
    modelVersion: "v1.5.0",
    status: "NEW",
    lastDecision: null,
    currentState: {
      value: alarming ? "Не замкнут" : "Норма",
      observedAt: now.toISOString(),
      alarming,
      outdated: false,
    },
    lastAlarmAt: alarming
      ? new Date(now.getTime() - Math.floor(Math.random() * 30 + 1) * 60 * 1000).toISOString()
      : null,
  };

  livePredictions = [p, ...livePredictions];
  return p;
}

/**
 * Возвращает снимок последних 100 активных HIGH.
 */
export function buildCriticalSnapshot(): PredictionPage {
  const now = Date.now();

  const active = getLiveIncidents().filter((p) => {
    if (p.riskLevel !== "HIGH") return false;
    const computed = Date.parse(p.computedAt);
    const horizon = Date.parse(p.horizonUntil);
    return computed <= now && now < horizon;
  });

  const sorted = sortPredictions(active);

  const limit = 100;
  const items = sorted.slice(0, limit);

  return {
    items,
    limit,
    offset: 0,
    hasMore: active.length > limit,
  };
}
