import type { DashboardRiskCounts } from "../types";

/** Прогнозы в зоне риска — MEDIUM и HIGH; LOW в «Активные риски» не входит. */
export function atRisk(counts: DashboardRiskCounts): number {
  return counts.MEDIUM + counts.HIGH;
}
