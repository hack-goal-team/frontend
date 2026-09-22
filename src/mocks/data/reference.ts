import type { ReferenceData } from "@/modules/reference/types";

export const mockReferenceData: ReferenceData = {
  reasons: [
    { code: "WEATHER", description: "Погодные условия" },
    { code: "WEAR", description: "Износ оборудования" },
    { code: "LOAD", description: "Повышенная нагрузка" },
    { code: "SENSOR", description: "Ошибка датчика" },
    { code: "OTHER", description: "Другое" },
  ],
  incidentTypes: [
    { code: "EQUIPMENT_FAILURE", description: "Отказ оборудования" },
    { code: "FIRE", description: "Пожар: обнаружен дым" },
    { code: "FLOOD", description: "Подтопление" },
    { code: "GAS", description: "Утечка газа" },
    { code: "INTRUSION", description: "Проникновение на объект" },
  ],
  riskThresholds: { medium: 0.4, high: 0.7 },
  predictionStatuses: [
    { code: "NEW", description: "Новый, не разобран" },
    { code: "REVIEWED", description: "Разобран диспетчером" },
  ],
};
