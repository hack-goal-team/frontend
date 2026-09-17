import { http, HttpResponse } from "msw";
import { mockPredictions } from "./data/predictions";

const BASE = "/api/v1";

export const handlers = [
  http.get(`${BASE}/predictions`, () => {
    return HttpResponse.json({
      items: mockPredictions,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  }),
];
