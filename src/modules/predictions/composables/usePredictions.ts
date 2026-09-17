import { useQuery } from "@tanstack/vue-query";
import { fetchPredictions } from "../api";
import { predictionKeys } from "../keys";

export function usePredictions() {
  return useQuery({
    queryKey: predictionKeys.list(),
    queryFn: () => fetchPredictions(),
  });
}
