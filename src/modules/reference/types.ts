import type { Code } from "@/shared/api/types";
import type { PredictionKind } from "@/modules/predictions/types";

/** Тип инцидента с видом: по нему фронт знает, во вкладке какой модели живёт тип. */
export interface IncidentType extends Code {
  kind: PredictionKind;
}

export interface ReferenceData {
  reasons: Code[];
  incidentTypes: IncidentType[];
  /**
   * Типы датчиков из актуального снапшота реестра, порядок по code. Кода у типа в источнике
   * нет: code — строка типа, как в `context.sensorType`, description — тип с инженерной системой.
   */
  sensorTypes: Code[];
  riskThresholds: { medium: number; high: number };
  /** Порог «к проверке» модели отказов 0…1 (env бэка, не /settings) — только для подсказки. */
  equipmentCheckThreshold: number;
  predictionStatuses: Code[];
  /**
   * Горизонт модели в часах: прогноз считается на каждое событие канала и живёт
   * столько часов, поэтому «без прогноза» = событий не было N часов (HACK-157).
   */
  predictionHorizonHours: number;
}
