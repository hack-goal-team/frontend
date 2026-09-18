import { get } from "@/shared/api/http";
import type { PredictionsQuery, PredictionPage, PredictionDetail } from "./types";

export function fetchPredictions(query: PredictionsQuery = {}): Promise<PredictionPage> {
  return get<PredictionPage>("/predictions", query);
}

export function fetchPrediction(id: string): Promise<PredictionDetail> {
  return get<PredictionDetail>(`/predictions/${id}`);
}
