import type { PredictionKind, RiskLevel } from "@/modules/predictions/types";
import { mockSettings } from "../state/settings";

/** Пороги берём из состояния `/settings`, как на бэке: уровень считается на чтении. */
export function riskFromProbability(probability: number): RiskLevel {
  if (probability >= mockSettings.riskHigh) return "HIGH";
  if (probability >= mockSettings.riskMedium) return "MEDIUM";
  return "LOW";
}

export const EQUIPMENT_CHECK_THRESHOLD = 0.7;

/** У отказов риск двоичный по своему порогу бэка: HIGH — «к проверке», MEDIUM не бывает. */
export function riskOf(kind: PredictionKind, probability: number): RiskLevel {
  if (kind !== "EQUIPMENT") return riskFromProbability(probability);
  return probability >= EQUIPMENT_CHECK_THRESHOLD ? "HIGH" : "LOW";
}
