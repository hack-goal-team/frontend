import type { PredictionsQuery } from "./types";

export const predictionKeys = {
  all: ["predictions"] as const,
  lists: () => [...predictionKeys.all, "list"] as const,
  list: (query: PredictionsQuery) => [...predictionKeys.lists(), query] as const,
};
