import { http, HttpResponse } from "msw";
import { mockDelay } from "../utils/delay";
import { mockReferenceData } from "../data/reference";
import { getCurrentUser } from "../state/auth";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

export const referenceHandlers = [
  http.get(`${BASE}/reference-data`, async () => {
    const user = getCurrentUser();
    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }
    await mockDelay();
    return HttpResponse.json(mockReferenceData);
  }),
];
