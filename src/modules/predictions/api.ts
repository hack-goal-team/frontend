import { get, getWithHeaders, post } from "@/shared/api/http";
import type { PredictionsQuery, PredictionPage, PredictionDetail, Decision, DecisionRequest } from "./types";

export async function fetchPredictions(query: PredictionsQuery = {}) {
  const { data, headers } = await getWithHeaders<PredictionPage>("/predictions", query);
  const total = Number(headers["x-total-count"] ?? 0);
  return { ...data, total };
}

export function fetchPrediction(id: string): Promise<PredictionDetail> {
  return get<PredictionDetail>(`/predictions/${id}`);
}

export function createDecision(request: DecisionRequest): Promise<Decision> {
  return post<Decision>("/decisions", request);
}
