import type { Decision, Prediction } from "@/modules/predictions/types";

/**
 * Решения для прогноза.
 *
 * В подходе A источник правды — prediction.lastDecision.
 * decisions — производное: либо [lastDecision], либо [].
 *
 * Это гарантирует инвариант:
 *   status === 'NEW'       → decisions.length === 0
 *   status === 'REVIEWED'  → decisions.length > 0
 */
export function generateDecisionsForPrediction(prediction: Prediction): Decision[] {
  if (!prediction.lastDecision) return [];
  return [prediction.lastDecision];
}
