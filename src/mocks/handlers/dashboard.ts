import { http, HttpResponse } from "msw";
import type { Dashboard, DashboardRiskCounts } from "@/modules/dashboard/types";
import type { Prediction, PredictionKind } from "@/modules/predictions/types";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { filterByScope } from "@/modules/predictions/lib/filterByScope";
import { getLivePredictions } from "../data/notifications";
import { latestByTarget } from "../lib/latestByTarget";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

function buildDashboard(items: Prediction[]): Dashboard {
  const now = Date.now();

  const activeRows = items.filter((p) => {
    return Date.parse(p.computedAt) <= now && now < Date.parse(p.horizonUntil);
  });
  const active = latestByTarget(activeRows);

  const riskCounts: DashboardRiskCounts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  const riskCountsByKind: Dashboard["riskCountsByKind"] = {
    INCIDENT: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    EQUIPMENT: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    LEGACY: { LOW: 0, MEDIUM: 0, HIGH: 0 },
  };
  const unreviewedByKind: Record<PredictionKind, number> = { INCIDENT: 0, EQUIPMENT: 0, LEGACY: 0 };
  let unreviewed = 0;

  for (const p of active) {
    riskCounts[p.riskLevel] += 1;
    riskCountsByKind[p.kind][p.riskLevel] += 1;
    // Как бэк: «Без решения» — только MEDIUM и HIGH.
    if (p.status === "NEW" && p.riskLevel !== "LOW") {
      unreviewed += 1;
      unreviewedByKind[p.kind] += 1;
    }
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
    riskCountsByKind,
    unreviewedByKind,
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
