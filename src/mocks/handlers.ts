import { http, HttpResponse } from "msw";
import { mockPredictions } from "./data/predictions";
import type { Prediction, PredictionsQuery } from "@/modules/predictions/types";
import { mockReferenceData } from "./data/reference";
import { mockDelay } from "./utils/delay";
import { generateDecisionsForPrediction } from "./data/generateDecisions";
import { buildCriticalSnapshot, spawnCriticalPrediction } from "./data/notifications";

const BASE = "/api/v1";

const SNAPSHOT_INTERVAL = 5000; // снимок — каждые 5 сек (по контракту)
const SPAWN_MIN = 10_000; // новый прогноз — не раньше 10 сек
const SPAWN_MAX = 20_000; // и не позже 20 сек
const STREAM_LIFETIME = 60_000; // закрытие через 1 мин (для отладки)

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

function parseQuery(url: URL): PredictionsQuery & {
  limit: number;
  offset: number;
} {
  const p = url.searchParams;

  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "") || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(p.get("offset") ?? "") || 0, 0);

  const q: PredictionsQuery & { limit: number; offset: number } = {
    limit,
    offset,
  };

  const incidentType = p.get("incidentType");
  if (incidentType) q.incidentType = incidentType;

  const targetKind = p.get("targetKind");
  if (targetKind) q.targetKind = targetKind;

  const targetRef = p.get("targetRef");
  if (targetRef) q.targetRef = targetRef;

  const from = p.get("from");
  if (from) q.from = from;

  const to = p.get("to");
  if (to) q.to = to;

  const status = p.get("status");
  if (status === "NEW" || status === "REVIEWED") q.status = status;

  const minProbabilityRaw = p.get("minProbability");
  if (minProbabilityRaw !== null) {
    const v = parseFloat(minProbabilityRaw);
    if (!Number.isNaN(v)) q.minProbability = Math.min(Math.max(v, 0), 1);
  }

  if (p.get("activeOnly") === "true") q.activeOnly = true;

  return q;
}

function applyFilters(items: Prediction[], q: PredictionsQuery): Prediction[] {
  const now = Date.now();
  const fromMs = q.from ? Date.parse(q.from) : null;
  const toMs = q.to ? Date.parse(q.to) : null;

  return items.filter((p) => {
    if (q.incidentType && p.incidentType !== q.incidentType) return false;
    if (q.targetKind && p.targetKind !== q.targetKind) return false;
    if (q.targetRef && !p.targetRef.includes(q.targetRef)) return false;
    if (q.status && p.status !== q.status) return false;
    if (q.minProbability !== undefined && p.probability < q.minProbability) return false;

    if (fromMs !== null && Date.parse(p.computedAt) < fromMs) return false;
    if (toMs !== null && Date.parse(p.computedAt) > toMs) return false;

    if (q.activeOnly) {
      const computed = Date.parse(p.computedAt);
      const horizon = Date.parse(p.horizonUntil);
      if (!(computed <= now && now < horizon)) return false;
    }

    return true;
  });
}

export const handlers = [
  http.get(`${BASE}/predictions`, async ({ request }) => {
    const url = new URL(request.url);
    const q = parseQuery(url);

    const filtered = applyFilters(mockPredictions, q);

    const sorted = [...filtered].sort((a, b) => {
      if (a.computedAt !== b.computedAt) {
        return a.computedAt < b.computedAt ? 1 : -1;
      }
      return a.id < b.id ? 1 : -1;
    });

    const pageItems = sorted.slice(q.offset, q.offset + q.limit);
    const hasMore = q.offset + q.limit < sorted.length;

    await mockDelay();
    return HttpResponse.json(
      {
        items: pageItems,
        limit: q.limit,
        offset: q.offset,
        hasMore,
      },
      { headers: { "X-Total-Count": String(sorted.length) } },
    );
  }),

  http.get(`${BASE}/predictions/:id`, async ({ params }) => {
    await mockDelay(300, 700);

    const id = String(params.id);
    const found = mockPredictions.find((p) => p.id === id);

    if (!found) {
      return HttpResponse.json(
        {
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: `Prediction ${id} not found`,
        },
        { status: 404 },
      );
    }

    const decisions = generateDecisionsForPrediction(found);

    return HttpResponse.json({
      prediction: found,
      decisions,
    });
  }),

  http.get(`${BASE}/reference-data`, async () => {
    await mockDelay();
    return HttpResponse.json(mockReferenceData);
  }),

  http.get(`${BASE}/notifications/stream`, () => {
    const encoder = new TextEncoder();

    // --- таймеры и флаг — снаружи, чтобы cancel() видел ---
    let closed = false;
    let snapshotTimer: ReturnType<typeof setInterval> | null = null;
    let spawnTimer: ReturnType<typeof setTimeout> | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (closed) return;
      closed = true;
      if (snapshotTimer) clearInterval(snapshotTimer);
      if (spawnTimer) clearTimeout(spawnTimer);
      if (closeTimer) clearTimeout(closeTimer);
      snapshotTimer = null;
      spawnTimer = null;
      closeTimer = null;
    };

    const stream = new ReadableStream({
      start(controller) {
        const send = (data: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`event: critical-predictions\n`));
            controller.enqueue(encoder.encode(`retry: 5000\n`));
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } catch {
            cleanup();
          }
        };

        // 1. Первый снимок сразу
        send(buildCriticalSnapshot());

        // 2. Снимок каждые 5 сек
        snapshotTimer = setInterval(() => {
          send(buildCriticalSnapshot());
        }, SNAPSHOT_INTERVAL);

        // 3. Новый прогноз через случайный интервал 10..20 сек
        const scheduleSpawn = () => {
          if (closed) return;
          const delay = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
          spawnTimer = setTimeout(() => {
            if (closed) return;
            spawnCriticalPrediction();
            scheduleSpawn();
          }, delay);
        };
        scheduleSpawn();

        // 4. Закрытие через 1 мин
        closeTimer = setTimeout(() => {
          cleanup();
          try {
            controller.close();
          } catch {
            // уже закрыт
          }
        }, STREAM_LIFETIME);
      },

      cancel() {
        // Клиент вызвал abort() — очищаем ресурсы
        cleanup();
      },
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
