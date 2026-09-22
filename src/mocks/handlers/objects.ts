import { http, HttpResponse } from "msw";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import type { HierarchyLevel } from "@/modules/objects/types";
import { mockObjects } from "../data/objects";
import { filterObjectsByScope } from "../lib/scopeObjects";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

function parseLevel(raw: string | null): HierarchyLevel | null {
  const value = Number(raw);
  return value === 1 || value === 2 || value === 3 ? (value as HierarchyLevel) : null;
}

export const objectHandlers = [
  /**
   * `GET /objects` — голый массив + `X-Total-Count`, пагинации нет (yaml:411-445).
   *
   * Про `withRisk`: параметр принимается и молча игнорируется — ровно как на настоящем
   * сервисе (yaml:420-422). Это осознанно: фолбэк-цепочка «реестр → производный из
   * активных прогнозов → недоступен» проверяется только на выдаче БЕЗ поля `risk`.
   * Захотите увидеть ветку «реестр умеет» — добавьте `risk` в `data/objects.ts`, и фронт
   * подхватит её без правок: `detectRiskSupport` переключится на "supported", скан
   * активных прогнозов сам выключится, а фильтр по риску станет активен.
   */
  http.get(`${BASE}/objects`, async ({ request }) => {
    const user = getCurrentUser();

    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }

    if (!hasPermission(user, PERMISSIONS.PREDICTION_READ)) {
      return problem(403, "Forbidden", "PREDICTION_READ required");
    }

    const url = new URL(request.url);
    let items = filterObjectsByScope(mockObjects, user);

    // У фронта уровень — клиентская проекция дерева, но параметр в контракте есть:
    // отдаём его поведение, чтобы проверка «выдача без родителей» была воспроизводима.
    const level = parseLevel(url.searchParams.get("level"));
    if (level !== null) items = items.filter((item) => item.hierarchyLevel === level);

    await mockDelay();

    return HttpResponse.json(items, {
      headers: { "X-Total-Count": String(items.length) },
    });
  }),
];
