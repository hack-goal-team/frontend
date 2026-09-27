import type { AuditQuery } from "./types";

export const auditKeys = {
  all: ["audit"] as const,
  lists: () => [...auditKeys.all, "list"] as const,
  list: (query: AuditQuery) => [...auditKeys.lists(), query] as const,
};
