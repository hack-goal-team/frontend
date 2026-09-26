import type { Decision, Prediction } from "@/modules/predictions/types";

/**
 * Решения, зафиксированные через форму, живут в памяти вкладки.
 * Append-only, как на бэке: пересмотр добавляет запись, история не переписывается.
 */
const byPredictionId = new Map<string, Decision[]>();

export function sessionDecisionsFor(predictionId: string): Decision[] {
  return byPredictionId.get(predictionId) ?? [];
}

/**
 * Перед первым добавлением поднимает в историю lastDecision прогноза,
 * чтобы он не потерялся: дальше история держится в сессии целиком.
 */
export function addSessionDecision(prediction: Prediction, decision: Decision) {
  const existing = sessionDecisionsFor(prediction.id);
  const seeded = existing.length === 0 && prediction.lastDecision ? [prediction.lastDecision] : existing;
  byPredictionId.set(prediction.id, [decision, ...seeded]);
}

export function decisionsForPrediction(prediction: Prediction): Decision[] {
  const session = sessionDecisionsFor(prediction.id);
  if (session.length > 0) return session;
  return prediction.lastDecision ? [prediction.lastDecision] : [];
}
