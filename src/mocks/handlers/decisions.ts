import { http, HttpResponse } from "msw";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { filterByScope } from "@/modules/predictions/lib/filterByScope";
import type { Decision, DecisionRequest } from "@/modules/predictions/types";
import { getCurrentUser } from "../state/auth";
import { getLivePredictions } from "../data/notifications";
import { addSessionDecision, decisionsForPrediction } from "../data/decisions";
import { mockReferenceData } from "../data/reference";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

// Идемпотентность по requestId: повтор того же тела отдаёт исходную запись (200),
// изменённое тело — 409.
const byRequestId = new Map<string, { body: string; decision: Decision }>();

export const decisionHandlers = [
  http.post(`${BASE}/decisions`, async ({ request }) => {
    const user = getCurrentUser();
    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }
    if (!hasPermission(user, PERMISSIONS.DECISION_CREATE)) {
      return problem(403, "Forbidden", "DECISION_CREATE required");
    }

    const body = (await request.json()) as DecisionRequest;

    // Реализована только ветка PREDICTION: ALARM бэк отклоняет с 400
    if (body.target?.type !== "PREDICTION") {
      return problem(400, "Bad Request", "Only PREDICTION target is supported");
    }

    const prediction = getLivePredictions().find((p) => p.id === body.target.predictionId);
    if (!prediction) {
      return problem(404, "Not Found", `Prediction ${body.target.predictionId} not found`);
    }

    // Объект вне области видимости → 404, как в GET /predictions/{id}
    if (filterByScope([prediction], user).length === 0) {
      return problem(404, "Not Found", "Prediction not found");
    }

    const reason = mockReferenceData.reasons.find((r) => r.code === body.reasonCode);
    if (!reason) {
      return problem(400, "Bad Request", `Unknown reasonCode: ${body.reasonCode}`);
    }
    if (reason.commentRequired && !body.comment?.trim()) {
      return problem(400, "Bad Request", `Comment is required for reasonCode ${body.reasonCode}`);
    }

    const bodyJson = JSON.stringify(body);
    const known = byRequestId.get(body.requestId);
    if (known) {
      if (known.body === bodyJson) {
        return HttpResponse.json(known.decision, { status: 200 });
      }
      return problem(409, "Conflict", "Same requestId with different body");
    }

    const decision: Decision = {
      id: `prediction:${prediction.id}:${decisionsForPrediction(prediction).length + 1}`,
      target: { type: "PREDICTION", predictionId: prediction.id },
      reasonCode: body.reasonCode,
      comment: body.comment?.trim() ? body.comment : null,
      decidedBy: user.username,
      decidedAt: new Date().toISOString(),
    };

    addSessionDecision(prediction, decision);
    prediction.status = "REVIEWED";
    prediction.lastDecision = decision;
    byRequestId.set(body.requestId, { body: bodyJson, decision });

    await mockDelay();

    return HttpResponse.json(decision, { status: 201 });
  }),
];
