import type { Code } from "@/shared/api/types";

export interface ReferenceData {
  reasons: Code[];
  incidentTypes: Code[];
  /**
   * Типы датчиков из актуального снапшота реестра, порядок по code. Кода у типа в источнике
   * нет: code — строка типа, как в `context.sensorType`, description — тип с инженерной системой.
   */
  sensorTypes: Code[];
  riskThresholds: { medium: number; high: number };
  predictionStatuses: Code[];
  /**
   * Горизонт модели в часах: прогноз считается на каждое событие канала и живёт
   * столько часов, поэтому «без прогноза» = событий не было N часов (HACK-157).
   */
  predictionHorizonHours: number;
}
