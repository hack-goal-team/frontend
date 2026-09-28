import type { ReferenceData } from "@/modules/reference/types";
import { mockSettings } from "../state/settings";
import { SENSOR_TYPES } from "./channels";
import { EQUIPMENT_CHECK_THRESHOLD } from "../lib/riskLevel";

export const mockReferenceData: ReferenceData = {
  reasons: [
    { code: "WEATHER", description: "Погодные условия" },
    { code: "WEAR", description: "Износ оборудования" },
    { code: "LOAD", description: "Повышенная нагрузка" },
    { code: "SENSOR", description: "Ошибка датчика" },
    { code: "MAINTENANCE_REQUESTED", description: "Заявка на проверку датчика (ТО)" },
    { code: "OTHER", description: "Другое", commentRequired: true },
  ],
  incidentTypes: [
    { code: "CHANNEL_EVENT", description: "Событие на канале по прогнозу модели", kind: "LEGACY" },
    { code: "EQUIPMENT_FAILURE", description: "Отказ датчика", kind: "EQUIPMENT" },
    { code: "FIRE", description: "Пожар", kind: "INCIDENT" },
    { code: "FLOOD", description: "Подтопление", kind: "INCIDENT" },
    { code: "GAS", description: "Загазованность", kind: "INCIDENT" },
    { code: "INTRUSION", description: "Проникновение", kind: "INCIDENT" },
  ],
  // code — та же строка типа, что в `context.sensorType` каналов реестра (`SENSOR_TYPES`):
  // фильтр журнала отдаёт тип точным совпадением; description дополняет тип инженерной системой.
  sensorTypes: [...SENSOR_TYPES]
    .sort((a, b) => a.code.localeCompare(b.code, "ru"))
    .map((t) => ({ code: t.code, description: `${t.code} — ${t.system}` })),
  // Пороги — те же, что отдаёт /settings: админ меняет их там, и справочник обязан
  // показать свежие, иначе фронт фильтрует журнал устаревшим порогом.
  get riskThresholds() {
    return { medium: mockSettings.riskMedium, high: mockSettings.riskHigh };
  },
  // Фиксированный порог бэка (env), в /settings не настраивается.
  equipmentCheckThreshold: EQUIPMENT_CHECK_THRESHOLD,
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
