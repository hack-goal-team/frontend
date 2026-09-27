import type { AuditFilters } from "./types";

export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  /** Ключ — только фильтры: offset живёт в pageParam бесконечного запроса. */
  list: (filters: AuditFilters) => [...auditKeys.lists(), filters] as const,
};
