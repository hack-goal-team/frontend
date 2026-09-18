import type { Prediction, PredictionPage } from "@/modules/predictions/types";
import { mockPredictions } from "./predictions";

// Мутабельная копия — мок будет её менять, чтобы имитировать новые прогнозы
let livePredictions: Prediction[] = [...mockPredictions];

let nextId = 10000;

/**
 * Имитирует появление нового критического прогноза.
 * Вызывается по таймеру из SSE-хендлера.
 */
export function spawnCriticalPrediction(): Prediction {
  const now = new Date();
  const horizon = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 часов

  const p: Prediction = {
    id: String(nextId++),
    targetKind: "COLLECTOR",
    targetRef: `K-${Math.floor(Math.random() * 99) + 1}`,
    incidentType: "FLOODING",
    probability: 0.85 + Math.random() * 0.15, // 0.85..1.00
    riskLevel: "HIGH",
    computedAt: now.toISOString(),
    horizonUntil: horizon.toISOString(),
    modelVersion: "v1.5.0",
    status: "NEW",
  };

  livePredictions = [p, ...livePredictions];
  return p;
}

/**
 * Возвращает снимок из livePredictions.
 */
export function buildCriticalSnapshot(): PredictionPage {
  const now = Date.now();

  const active = livePredictions.filter((p) => {
    if (p.riskLevel !== "HIGH") return false;
    const computed = Date.parse(p.computedAt);
    const horizon = Date.parse(p.horizonUntil);
    return computed <= now && now < horizon;
  });

  active.sort((a, b) => {
    if (a.computedAt !== b.computedAt) {
      return a.computedAt < b.computedAt ? 1 : -1;
    }
    return a.id < b.id ? 1 : -1;
  });

  const limit = 100;
  const items = active.slice(0, limit);

  return {
    items,
    limit,
    offset: 0,
    hasMore: active.length > limit,
  };
}
