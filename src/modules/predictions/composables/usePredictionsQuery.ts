import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { fetchPredictions } from "../api";
import { predictionKeys } from "../keys";
import type { PredictionsQuery } from "../types";
import { useAuthStore } from "@/modules/auth/store";

export function usePredictionsQuery(
  query: MaybeRefOrGetter<PredictionsQuery> = {},
  options: { refetchInterval?: number } = {},
) {
  const auth = useAuthStore();

  return useQuery({
    queryKey: computed(() => predictionKeys.list(toValue(query))),
    queryFn: () => fetchPredictions(toValue(query)),
    placeholderData: (prev) => prev,
    staleTime: 30_000, // 30 секунд: баланс между свежестью и нагрузкой
    enabled: computed(() => !auth.isEmptyScope),
    refetchInterval: options.refetchInterval,
  });
}
