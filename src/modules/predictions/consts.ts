import type { PredictionKind, RiskLevel } from "./types";

// ---- Вид прогноза ----

export const DEFAULT_KIND: PredictionKind = "INCIDENT";

export const KIND_LABEL: Record<PredictionKind, string> = {
  INCIDENT: "Инциденты",
  EQUIPMENT: "Оборудование",
};

// Подпись класса — из справочника, здесь только значок; неизвестный код — без значка.
export const INCIDENT_ICON: Record<string, string> = {
  FIRE: "🔥",
  FLOOD: "💧",
  GAS: "💨",
  INTRUSION: "🚪",
  EQUIPMENT_FAILURE: "🔧",
};

// ---- Риск ----

export const RISK_TAG_TYPE: Record<RiskLevel, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
};

export const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
];

// ---- Статус ----

// Подписи — справочником `/reference-data` (predictionStatuses), здесь только цвет;
// неизвестный код (бэк добавляет их без релиза фронта) рендерится нейтральным «info».
export const STATUS_TAG_TYPE: Record<string, "info" | "success"> = {
  NEW: "success",
  REVIEWED: "info",
};

// ---- Факторы прогноза (reasons) ----

export const REASON_GROUP_LABEL: Record<string, string> = {
  STATIC: "Статика",
  SENSOR_HISTORY: "История датчика",
  CALENDAR: "Календарь",
  WEATHER: "Погода",
};

// ---- Пагинация ----

export const DEFAULT_LIMIT = 50;
export const DEFAULT_OFFSET = 0;
export const PAGE_SIZE_OPTIONS = [25, 50, 100];
