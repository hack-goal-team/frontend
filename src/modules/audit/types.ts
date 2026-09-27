export interface AuditEntry {
  /** bigint → строка, как все id контракта. */
  id: string;
  occurredAt: string;
  actor: string;
  category: string;
  action: string;
  target: string;
  /** JSON-строка с деталями записи; разбор — на совести показывающего. */
  payload: string;
}

export interface AuditPage {
  items: AuditEntry[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface AuditFilters {
  /** Интервал `[from, to)`, ISO 8601 с зоной. */
  from?: string;
  to?: string;
  /** Логин — точное совпадение, не подстрока. */
  actor?: string;
  /** Закрытый enum (см. `AUDIT_CATEGORIES`). */
  category?: string;
  /** Открытый набор кодов, на бэк уходит повторяющимся параметром (`style: form, explode: true`). */
  action?: string[];
}

export interface AuditQuery extends AuditFilters {
  limit?: number;
  offset?: number;
}
