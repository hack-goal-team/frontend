import type { RiskLevel } from "@/modules/predictions/types";
import { mockSettings } from "../state/settings";

/** Пороги берём из состояния `/settings`, как на бэке: уровень считается на чтении. */
export function riskFromProbability(probability: number): RiskLevel {
  if (probability >= mockSettings.riskHigh) return "HIGH";
  if (probability >= mockSettings.riskMedium) return "MEDIUM";
  return "LOW";
}
