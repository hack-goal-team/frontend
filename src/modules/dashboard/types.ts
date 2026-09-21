export interface DashboardRiskCounts {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
}

export interface Dashboard {
  generatedAt: string;
  latestPredictionAt: string | null;
  activePredictions: number;
  predictionRows: number;
  unreviewedPredictions: number;
  riskCounts: DashboardRiskCounts;
}
