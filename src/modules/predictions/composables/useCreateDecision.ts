import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { createDecision } from "../api";
import { predictionKeys } from "../keys";
import { dashboardKeys } from "@/modules/dashboard/keys";
import type { DecisionRequest } from "../types";

export function useCreateDecision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: DecisionRequest) => createDecision(request),
    onSuccess: () => {
      // Решение меняет status и lastDecision прогноза: список и деталь читаются заново
      void queryClient.invalidateQueries({ queryKey: predictionKeys.all });
      // И счётчик «Без решения» на дашборде (unreviewedPredictions)
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
