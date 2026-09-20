// src/mocks/handlers/notifications.ts
import { http, HttpResponse } from "msw";
import { getCurrentUser } from "../state/auth";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { PERMISSIONS } from "@/modules/auth/consts";
import { buildCriticalSnapshot, spawnCriticalPrediction } from "../data/notifications";
import { createSseStream } from "../lib/sse";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

const SNAPSHOT_INTERVAL = 5000;
const SPAWN_MIN = 10_000;
const SPAWN_MAX = 20_000;
const STREAM_LIFETIME = 60_000;

export const notificationHandlers = [
  http.get(`${BASE}/notifications/stream`, () => {
    const user = getCurrentUser();

    // 1. Не залогинен → 401
    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }

    // 2. Нет права PREDICTION_READ → 403
    //    (по контракту: SSE требует PREDICTION_READ, иначе 403)
    if (!hasPermission(user, PERMISSIONS.PREDICTION_READ)) {
      return problem(403, "Forbidden", "PREDICTION_READ required for notifications stream");
    }

    // 3. Область видимости
    const scope = user.scope;

    // 4. Создаём SSE-стрим.
    //    getSnapshot оборачивает buildCriticalSnapshot и применяет фильтр по scope.
    //    Для EMPTY — всегда пустой снимок.
    const stream = createSseStream({
      snapshotInterval: SNAPSHOT_INTERVAL,
      getSnapshot: () => {
        const full = buildCriticalSnapshot();

        // EMPTY — пустой снимок
        if (scope.kind === "EMPTY") {
          return {
            items: [],
            limit: 100,
            offset: 0,
            hasMore: false,
          };
        }

        // ALL — без фильтра
        if (scope.kind === "ALL") {
          return full;
        }

        // OBJECT / DISTRICT — фильтр по objectIds
        const allowed = new Set(scope.objectIds.map(String));
        const items = full.items.filter((p) => {
          const objectId = p.context?.objectId;
          if (!objectId) return false;
          return allowed.has(objectId);
        });

        return {
          items,
          limit: 100,
          offset: 0,
          hasMore: items.length === 100, // грубая оценка: если 100 — возможно, есть ещё
        };
      },
      spawnInterval: [SPAWN_MIN, SPAWN_MAX],
      onSpawn: spawnCriticalPrediction,
      lifetime: STREAM_LIFETIME,
    });

    return new HttpResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }),
];
