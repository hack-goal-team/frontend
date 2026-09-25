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
   * `GET /objects` — голый массив + `X-Total-Count`, пагинации нет (контракт v0).
   *
   * Параметр — только `level`; полей `risk` и `channelCount` объект не несёт, и мок их
   * не выдумывает: риск реестра фронт выводит сканом `/predictions?activeOnly=true`,
   * число каналов — из `X-Total-Count` `/channels`.
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
