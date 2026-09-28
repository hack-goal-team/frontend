export interface DashboardRiskCounts {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
}

import type { PredictionKind } from "@/modules/predictions/types";

export interface Dashboard {
  generatedAt: string;
  latestPredictionAt: string | null;
  activePredictions: number;
  predictionRows: number;
  unreviewedPredictions: number;
  /** Смешивает все виды прогнозов — карточки инцидентов берут `riskCountsByKind.INCIDENT`. */
  riskCounts: DashboardRiskCounts;
  riskCountsByKind: Record<PredictionKind, DashboardRiskCounts>;
  /** То же разбиение для `unreviewedPredictions`; «Без решения» — по `INCIDENT`. */
  unreviewedByKind: Record<PredictionKind, number>;
}
