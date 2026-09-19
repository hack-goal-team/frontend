import type { PredictionsQuery } from "./types";

export const predictionKeys = {
  all: ["predictions"] as const,
  lists: () => [...predictionKeys.all, "list"] as const,
  list: (query: PredictionsQuery) => [...predictionKeys.lists(), query] as const,
  details: () => [...predictionKeys.all, "detail"] as const,
  detail: (id: string) => [...predictionKeys.details(), id] as const,
};
