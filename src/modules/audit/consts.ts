export const AUDIT_TITLE = "Аудит";

/** Размер страницы по умолчанию; по контракту у ручки тот же дефолт 50, максимум 100. */
export const AUDIT_PAGE_SIZE = 50;

/** Категории — закрытый enum контракта: значения вне списка `GET /audit` не принимает (400). */
export const AUDIT_CATEGORIES = ["AUTHORIZATION", "DECISION", "CHANGE_CONFIG", "REPORT", "IMPORT"] as const;

/**
 * Действия — набор открытый (контракт перечисляет типовые «и другие»), поэтому фильтр
 * с ручным вводом. Здесь те, что встречаются в контуре: коды из контракта плюс коды
 * ручек настроек; список подсказывает фильтру опции и задаёт алфавит генерации моков.
 */
export const AUDIT_ACTIONS = [
  "LOGIN_SUCCEEDED",
  "LOGIN_FAILED",
  "LOGIN_DENIED",
  "LOGOUT",
  "ACCESS_DENIED",
  "DECISION_CREATE",
  "CONFIG_UPDATE",
  "REPORT_GENERATE",
  "IMPORT_START",
  "IMPORT_FINISH",
  "WEATHER_REFRESH",
  "REGISTRY_REFRESH",
  "ODS_REFRESH",
] as const;

/** Паттерн кода действия из контракта — `^[A-Z][A-Z_]{0,63}$`. */
export const AUDIT_ACTION_PATTERN = /^[A-Z][A-Z_]{0,63}$/;
