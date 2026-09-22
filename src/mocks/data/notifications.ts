import type { Prediction, PredictionPage } from "@/modules/predictions/types";
import { mockPredictions } from "./predictions";
import { sortPredictions } from "../lib/sortPredictions";

// Мутабельная копия — мок меняет её, чтобы имитировать новые прогнозы
let livePredictions: Prediction[] = [...mockPredictions];

let nextId = 10000;

/** Живой журнал: моки /dashboard и /predictions должны видеть порождённые SSE-прогнозы. */
export function getLivePredictions(): Prediction[] {
  return livePredictions;
}

/**
 * Имитирует появление нового критического прогноза.
 * Вызывается по таймеру из SSE-хендлера.
 */
export function spawnCriticalPrediction(): Prediction {
  const now = new Date();
  const horizon = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const objectId = String(Math.floor(Math.random() * 20) + 1);

  const p: Prediction = {
    id: String(nextId++),
    targetKind: "channel",
    targetRef: `channel/${objectId}-${Math.floor(Math.random() * 1000)}`,
    context: {
      objectId,
      objectName: `Объект ${objectId}`,
      channelId: null,
      sensorName: "Датчик температуры",
      sensorType: "Датчик температуры",
      engineeringSystem: "Температурная подсистема",
    },
    incidentType: "FLOOD",
    probability: 0.85 + Math.random() * 0.15,
    riskLevel: "HIGH",
    computedAt: now.toISOString(),
    horizonUntil: horizon.toISOString(),
    modelVersion: "v1.5.0",
    status: "NEW",
    lastDecision: null,
  };

  livePredictions = [p, ...livePredictions];
  return p;
}

/**
 * Возвращает снимок последних 100 активных HIGH.
 */
export function buildCriticalSnapshot(): PredictionPage {
  const now = Date.now();

  const active = livePredictions.filter((p) => {
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
