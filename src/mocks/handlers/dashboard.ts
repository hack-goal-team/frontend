import { http, HttpResponse } from "msw";
import type { Dashboard, DashboardRiskCounts } from "@/modules/dashboard/types";
import type { Prediction } from "@/modules/predictions/types";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { filterByScope } from "@/modules/predictions/lib/filterByScope";
import { getLivePredictions } from "../data/notifications";
import { sortPredictions } from "../lib/sortPredictions";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

/**
 * Единица счёта — сочетание «цель + тип инцидента»: одну цель модель считает
 * несколько раз, наивный подсчёт строк показал бы три проблемы там, где она одна.
 */
function targetKey(p: Prediction): string {
  return `${p.targetKind}|${p.targetRef}|${p.incidentType}`;
}

function latestByTarget(items: Prediction[]): Prediction[] {
  const latest = new Map<string, Prediction>();

  // sortPredictions — computedAt DESC, id DESC: первый в группе и есть последний расчёт
  for (const p of sortPredictions(items)) {
    const key = targetKey(p);
    if (!latest.has(key)) latest.set(key, p);
  }

  return [...latest.values()];
}

function buildDashboard(items: Prediction[]): Dashboard {
  const now = Date.now();

  const activeRows = items.filter((p) => {
    return Date.parse(p.computedAt) <= now && now < Date.parse(p.horizonUntil);
  });
  const active = latestByTarget(activeRows);

  const riskCounts: DashboardRiskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  let unreviewed = 0;

  for (const p of active) {
    riskCounts[p.riskLevel] += 1;
    if (p.status === "NEW") unreviewed += 1;
  }

  // latestPredictionAt считается по всей области видимости, включая истёкшие
  const latest = items.reduce<string | null>((acc, p) => (!acc || p.computedAt > acc ? p.computedAt : acc), null);

  return {
    generatedAt: new Date().toISOString(),
    latestPredictionAt: latest,
    activePredictions: active.length,
    predictionRows: activeRows.length,
    unreviewedPredictions: unreviewed,
    riskCounts,
  };
}

export const dashboardHandlers = [
  http.get(`${BASE}/dashboard`, async () => {
    const user = getCurrentUser();

    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }

    if (!hasPermission(user, PERMISSIONS.PREDICTION_READ)) {
      return problem(403, "Forbidden", "PREDICTION_READ required");
    }

    const scoped = filterByScope(getLivePredictions(), user);

    await mockDelay();

    return HttpResponse.json(buildDashboard(scoped));
  }),
];
