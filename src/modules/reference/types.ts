import type { Code } from "@/shared/api/types";

export interface ReferenceData {
  reasons: Code[];
  incidentTypes: Code[];
  /**
   * Типы датчиков из актуального снапшота реестра, по алфавиту. Кода у типа в источнике
   * нет, поэтому это строки — те же значения, что приходят в `context.sensorType`.
   */
  sensorTypes: string[];
  riskThresholds: { medium: number; high: number };
  predictionStatuses: Code[];
  /**
   * Горизонт модели в часах: прогноз считается на каждое событие канала и живёт
   * столько часов, поэтому «без прогноза» = событий не было N часов (HACK-157).
   */
  predictionHorizonHours: number;
}
