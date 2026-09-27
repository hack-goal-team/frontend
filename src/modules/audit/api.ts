import { http } from "@/shared/api/http";
import type { AuditPage, AuditQuery } from "./types";

/**
 * `GET /audit` — страница `PageAuditEntry` с `hasMore`, `X-Total-Count` в контракте нет.
 * Не через хелпер `get`: `action` — массив строк (?action=a&action=b), а axios по умолчанию
 * сериализует массивы как `action[]=…`, чего Spring-бэк не принимает.
 */
export async function fetchAudit(query: AuditQuery = {}): Promise<AuditPage> {
  const { data } = await http.get<AuditPage>("/audit", {
    params: query,
    paramsSerializer: { indexes: null },
  });
  return data;
}
