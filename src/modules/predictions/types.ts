export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type PredictionStatus = "NEW" | "REVIEWED";

export interface TargetContext {
  objectId: string | null;
  objectName: string | null;
  channelId: string | null;
  sensorName: string | null;
  sensorType: string | null;
  engineeringSystem: string | null;
}

export interface Prediction {
  id: string;
  targetKind: string;
  targetRef: string;
  context: TargetContext;
  incidentType: string;
  probability: number;
  riskLevel: RiskLevel;
  computedAt: string;
  horizonUntil: string;
  modelVersion: string;
  status: PredictionStatus;
  lastDecision: Decision | null;
}

export interface PredictionPage {
  items: Prediction[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface PredictionDetail {
  prediction: Prediction;
  decisions: Decision[];
}

export interface PredictionsQuery {
  limit?: number;
  offset?: number;
  from?: string;
  to?: string;
  objectId?: string;
  incidentType?: string;
  targetKind?: string;
  targetRef?: string;
  status?: PredictionStatus;
  minProbability?: number;
  activeOnly?: boolean;
}

export interface Decision {
  id: string;
  target: PredictionTarget | AlarmTarget;
  reasonCode: string;
  comment: string | null;
  decidedBy: string;
  decidedAt: string;
}

export interface PredictionTarget {
  type: "PREDICTION";
  predictionId: string;
}

export interface AlarmTarget {
  type: "ALARM";
  eventId: string;
  eventTs: string;
}

export interface DecisionRequest {
  requestId: string;
  target: PredictionTarget;
  reasonCode: string;
  comment: string | null;
}
