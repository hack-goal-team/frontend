import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { fetchPrediction } from "../api";
import { predictionKeys } from "../keys";

export function usePredictionQuery(id: MaybeRefOrGetter<string | null>) {
  return useQuery({
    queryKey: computed(() => predictionKeys.detail(toValue(id) ?? "")),
    queryFn: () => fetchPrediction(toValue(id)!),
    enabled: computed(() => !!toValue(id)),
    staleTime: 0,
  });
}
