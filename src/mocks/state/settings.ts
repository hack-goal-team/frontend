import type { SettingsView } from "@/modules/settings/types";

/**
 * Состояние `/settings` — один объект на все мок-ручки: из него же считает пороги
 * `/reference-data` и `riskLevel` журнала, иначе dev-цепочка «админ поменял порог →
 * справочник и уровни пересчитались» была бы непроверяемой.
 */
export const mockSettings: SettingsView = {
  decisionCoverHours: 1,
  sensorFreshHours: 72,
  riskMedium: 0.4,
  riskHigh: 0.7,
  predictionHorizonHours: 24,
  updatedAt: null,
  updatedBy: null,
};
