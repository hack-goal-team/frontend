import { useRouter } from "vue-router";
import { useReferenceStore } from "@/modules/reference/store";

/**
 * Навигация на таблицу прогнозов с фильтром «критические активные».
 * Порог HIGH берётся из reference-data.riskThresholds.high.
 */
export function useCriticalNavigation() {
  const router = useRouter();
  const reference = useReferenceStore();

  function showCritical() {
    const high = reference.data?.riskThresholds.high ?? 0.7;

    router.push({
      name: "predictions",
      query: {
        activeOnly: "true",
        minProbability: String(high),
        status: "NEW",
        offset: "0",
        from: "header",
      },
    });
  }

  return { showCritical };
}
