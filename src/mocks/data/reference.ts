import type { ReferenceData } from "@/modules/reference/types";
import { mockSettings } from "../state/settings";

export const mockReferenceData: ReferenceData = {
  reasons: [
    { code: "WEATHER", description: "Погодные условия" },
    { code: "WEAR", description: "Износ оборудования" },
    { code: "LOAD", description: "Повышенная нагрузка" },
    { code: "SENSOR", description: "Ошибка датчика" },
    { code: "OTHER", description: "Другое", commentRequired: true },
  ],
  incidentTypes: [
    { code: "EQUIPMENT_FAILURE", description: "Отказ оборудования" },
    { code: "FIRE", description: "Пожар: обнаружен дым" },
    { code: "FLOOD", description: "Подтопление" },
    { code: "GAS", description: "Утечка газа" },
    { code: "INTRUSION", description: "Проникновение на объект" },
  ],
  // Пороги — те же, что отдаёт /settings: админ меняет их там, и справочник обязан
  // показать свежие, иначе фронт фильтрует журнал устаревшим порогом.
  get riskThresholds() {
    return { medium: mockSettings.riskMedium, high: mockSettings.riskHigh };
  },
  predictionStatuses: [
    { code: "NEW", description: "Новый, не разобран" },
    { code: "REVIEWED", description: "Разобран диспетчером" },
    { code: "COVERED", description: "Покрыт решением по более свежему прогнозу" },
  ],
  // Тот же источник, что у /settings: горизонт оттуда же, и подсказка «событий не было
  // N часов» на реестре обязана показывать N, которое отдаёт сервис, а не 24 из документации.
  get predictionHorizonHours() {
    return mockSettings.predictionHorizonHours;
  },
};
