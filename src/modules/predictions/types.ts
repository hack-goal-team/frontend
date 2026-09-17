export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type PredictionStatus = "NEW" | "REVIEWED";

export interface Prediction {
  id: string;
  targetKind: string;
  targetRef: string;
  incidentType: string;
  probability: number; // 0..1
  riskLevel: RiskLevel;
  computedAt: string; // ISO 8601 UTC
  horizonUntil: string; // ISO 8601 UTC
  modelVersion: string;
  status: PredictionStatus;
}

export interface PredictionPage {
  items: Prediction[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PredictionsQuery {
  limit?: number; // 1..100, default 50
  offset?: number; // 0..100000, default 0
  incidentType?: string;
  targetKind?: string;
  targetRef?: string;
  from?: string; // ISO date-time, фильтр по computedAt
  to?: string; // ISO date-time, фильтр по computedAt
  status?: PredictionStatus;
  minProbability?: number; // 0..1
  activeOnly?: boolean; // default false
}
