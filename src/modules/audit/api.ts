import { http } from "@/shared/api/http";
import type { AuditPage, AuditQuery } from "./types";

/**
 * `GET /audit` — страница `PageAuditEntry`, тотальность — из `X-Total-Count`, по образцу
 * `fetchPredictions`. Не через хелперы `get`/`getWithHeaders`: `action` — массив строк
 * (?action=a&action=b), а axios по умолчанию сериализует массивы как `action[]=…`, чего
 * Spring-бэк не принимает; `paramsSerializer` можно передать только в конфигурации запроса.
 */
export async function fetchAudit(query: AuditQuery = {}): Promise<AuditPage & { total: number }> {
  const { data, headers } = await http.get<AuditPage>("/audit", {
    params: query,
    paramsSerializer: { indexes: null },
  });
  const total = Number(headers["x-total-count"] ?? 0);
  return { ...data, total };
}
