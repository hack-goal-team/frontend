export const AUDIT_TITLE = "Аудит";

/** Размер страницы «Показать ещё»; по умолчанию у ручки 50, максимум 100. */
export const AUDIT_PAGE_SIZE = 50;

/**
 * Словарь категорий/действий бэк справочником не отдаёт — эти списки нужны только
 * опциям фильтров и генерации моков. Несовпавший с бэком код вводится вручную
 * (у селектов включён allow-create), поэтому рассинхрон не блокирует фильтрацию.
 */
export const AUDIT_CATEGORIES = ["AUTH", "SETTINGS", "INTEGRATION", "IMPORT", "DECISIONS"] as const;

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "UPDATE",
  "REFRESH_WEATHER",
  "REFRESH_REGISTRY",
  "REFRESH_ODS",
  "CREATE",
  "COVER",
] as const;
