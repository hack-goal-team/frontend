import type { JournalKind, RiskLevel } from "./types";

// ---- Вид прогноза ----

export const DEFAULT_KIND: JournalKind = "INCIDENT";

export const KIND_LABEL: Record<JournalKind, string> = {
  INCIDENT: "Инциденты",
  EQUIPMENT: "Оборудование",
};

export const KIND_HINT = {
  EQUIPMENT: "Оборудование — прогноз отказа датчика. Срочных уведомлений нет — плановая проверка",
};

// Инцидент на датчике, который модель отказов считает «к проверке»: тревога может быть ложной.
export const SENSOR_AT_RISK = "Датчик в зоне риска отказа — прогноз может быть ложным";

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
// NEW — primary, а не зелёный: зелёный читается как «всё хорошо», а строка ждёт решения.
export const STATUS_TAG_TYPE: Record<string, "info" | "primary"> = {
  NEW: "primary",
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
