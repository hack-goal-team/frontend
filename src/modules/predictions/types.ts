import type { Code } from "@/shared/api/types";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type PredictionStatus = "NEW" | "REVIEWED" | "COVERED";

/**
 * Вид прогноза — какая модель его написала. INCIDENT — 4 класса аварий (FIRE / FLOOD / GAS /
 * INTRUSION), EQUIPMENT — модель отказов (EQUIPMENT_FAILURE). Вероятности двух видов несопоставимы.
 */
export type PredictionKind = "INCIDENT" | "EQUIPMENT";

export type PredictionReasonDirection = "UP" | "DOWN";

export interface PredictionReason {
  factor: string;
  feature: string;
  /** В контракте просто `string`: STATIC / SENSOR_HISTORY / CALENDAR / WEATHER, бэк может расширить. */
  group: string;
  direction: PredictionReasonDirection;
  contribution: number;
  value: string | number | null;
}

export interface TargetContext {
  objectId: string | null;
  objectName: string | null;
  channelId: string | null;
  sensorName: string | null;
  sensorType: string | null;
  engineeringSystem: string | null;
  /**
   * Класс инцидента по типу датчика: FIRE / FLOOD / GAS / INTRUSION. null у типов,
   * которые ни к одному классу не относятся (температура, ИБП, фаза), и вне реестра.
   */
  incidentClass: Code | null;
}

export interface SensorState {
  value: string;
  observedAt: string;
  /** Событие уже наступило — это не предупреждение, а свершившийся инцидент. */
  alarming: boolean;
  outdated: boolean;
}

export interface Prediction {
  id: string;
  targetKind: string;
  targetRef: string;
  context: TargetContext;
  incidentType: string;
  kind: PredictionKind;
  probability: number;
  riskLevel: RiskLevel;
  computedAt: string;
  horizonUntil: string;
  modelVersion: string;
  status: PredictionStatus;
  lastDecision: Decision | null;
  /** Возвращает GET /predictions/{id}; в списке моков и старых ответов может отсутствовать. */
  reasons?: PredictionReason[];
  /** Поля есть в docs/api-docs.json, но не в openapi-frontend.yaml v0.2 — считаем опциональными. */
  currentState?: SensorState | null;
  lastAlarmAt?: string | null;
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
  /** Период по `computedAt`, интервал `[from, to)` — верхняя граница не включается. */
  from?: string;
  to?: string;
  objectId?: string;
  incidentType?: string;
  /** Без параметра бэк отдаёт оба вида; журнал всегда шлёт один — вкладки не смешивают шкалы. */
  kind?: PredictionKind;
  /** Точное совпадение с `context.sensorType`, значение — code из `sensorTypes` справочника. */
  sensorType?: string;
  /**
   * Фильтр по `currentState.alarming`: true — датчик сейчас в тревоге, false — в норме.
   * Прогнозы без `currentState` не попадают ни в один вариант, `outdated` не учитывается.
   */
  alarming?: boolean;
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
