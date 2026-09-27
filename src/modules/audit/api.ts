import { http } from "@/shared/api/http";
import type { AuditPage, AuditQuery } from "./types";

/**
 * `GET /audit` — страница записей, тотальность — из `X-Total-Count`, по образцу
 * `fetchPredictions`. Не через хелперы `get`/`getWithHeaders` по двум причинам:
 * `action` — массив и по контракту (`style: form, explode: true`) должен уходить
 * повторяющимся параметром (`?action=a&action=b`), а axios по умолчанию сериализует
 * массивы как `action[]=…`; `paramsSerializer` же передаётся только в конфигурации запроса.
 * Дефолтный кодировщик axios при этом заменяет `+` в смещении даты на `%2B` — без этого
 * Spring прочитает `+` как пробел и ответит 400.
 */
export async function fetchAudit(query: AuditQuery = {}): Promise<AuditPage & { total: number }> {
  const { data, headers } = await http.get<AuditPage>("/audit", {
    params: query,
    paramsSerializer: { indexes: null },
  });
  const total = Number(headers["x-total-count"] ?? 0);
  return { ...data, total };
}
