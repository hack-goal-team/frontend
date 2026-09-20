import type { ReferenceData } from "@/modules/reference/types";

export const mockReferenceData: ReferenceData = {
  reasons: [
    { code: "WEATHER", description: "Погодные условия" },
    { code: "WEAR", description: "Износ оборудования" },
    { code: "LOAD", description: "Повышенная нагрузка" },
    { code: "SENSOR", description: "Ошибка датчика" },
    { code: "OTHER", description: "Другое" },
  ],
  incidentTypes: ["FLOODING", "OVERHEAT", "FAILURE", "PRESSURE_DROP", "LEAK", "POWER_OUTAGE"],
  riskThresholds: { medium: 0.4, high: 0.7 },
  predictionStatuses: ["NEW", "REVIEWED"],
};
