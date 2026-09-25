import { http, HttpResponse } from "msw";
import { generateDecisionsForPrediction } from "../data/generateDecisions";
import { getLivePredictions } from "../data/notifications";
import { sortPredictions } from "../lib/sortPredictions";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import type { Prediction, PredictionsQuery } from "@/modules/predictions/types";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { filterByScope } from "@/modules/predictions/lib/filterByScope";
import { problem } from "../utils/problem";

const BASE = "/api/v1";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// --- Problem-хелперы ---

function forbidden(detail?: string) {
  return problem(403, "Forbidden", detail);
}

function notFound(detail?: string) {
  return problem(404, "Not Found", detail);
}

// --- Парсинг query ---

function parseQuery(url: URL): PredictionsQuery & { limit: number; offset: number } {
  const p = url.searchParams;

  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "") || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const offset = Math.max(parseInt(p.get("offset") ?? "") || 0, 0);

  const q: PredictionsQuery & { limit: number; offset: number } = { limit, offset };

  const incidentType = p.get("incidentType");
  if (incidentType) q.incidentType = incidentType;

  const objectId = p.get("objectId");
  if (objectId) q.objectId = objectId;

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

// --- Фильтры ---

function applyFilters(items: Prediction[], q: PredictionsQuery): Prediction[] {
  const now = Date.now();
  const fromMs = q.from ? Date.parse(q.from) : null;
  const toMs = q.to ? Date.parse(q.to) : null;

  return items.filter((p) => {
    if (q.incidentType && p.incidentType !== q.incidentType) return false;
    if (q.objectId && p.context?.objectId !== q.objectId) return false;
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

// --- Хендлеры ---

export const predictionHandlers = [
  http.get(`${BASE}/predictions`, async ({ request }) => {
    const user = getCurrentUser();

    if (!hasPermission(user, PERMISSIONS.PREDICTION_READ)) {
      return forbidden("PREDICTION_READ required");
    }

    const url = new URL(request.url);
    const q = parseQuery(url);

    const filtered = applyFilters(getLivePredictions(), q);
    const scoped = filterByScope(filtered, user);
    const sorted = sortPredictions(scoped);

    const pageItems = sorted.slice(q.offset, q.offset + q.limit);
    const hasMore = q.offset + q.limit < sorted.length;

    await mockDelay();

    return HttpResponse.json(
      { items: pageItems, limit: q.limit, offset: q.offset, hasMore },
      { headers: { "X-Total-Count": String(sorted.length) } },
    );
  }),

  http.get(`${BASE}/predictions/:id`, async ({ params }) => {
    const user = getCurrentUser();

    if (!hasPermission(user, PERMISSIONS.PREDICTION_READ)) {
      return forbidden("PREDICTION_READ required");
    }

    const id = String(params.id);
    const found = getLivePredictions().find((p) => p.id === id);

    if (!found) {
      return notFound(`Prediction ${id} not found`);
    }

    // Объект вне области → 404 (не 403 — не подтверждаем существование)
    const scoped = filterByScope([found], user);
    if (scoped.length === 0) {
      return notFound();
    }

    const decisions = generateDecisionsForPrediction(found);

    await mockDelay(300, 700);

    return HttpResponse.json({
      prediction: found, // уже содержит lastDecision
      decisions, // [lastDecision] или []
    });
  }),
];
