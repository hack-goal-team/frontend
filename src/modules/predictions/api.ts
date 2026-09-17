import { get } from "@/shared/api/http";
import type { PredictionsQuery, PredictionPage } from "./types";

export function fetchPredictions(query: PredictionsQuery = {}): Promise<PredictionPage> {
  return get<PredictionPage>("/predictions", query);
}
