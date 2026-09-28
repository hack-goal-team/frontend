import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useReferenceStore } from "@/modules/reference/store";
import { THRESHOLD_UNAVAILABLE } from "@/modules/reference/consts";
import "element-plus/theme-chalk/el-message.css";

/**
 * Навигация на таблицу прогнозов с фильтром «критические активные».
 * Порог HIGH берётся из reference-data.riskThresholds.high и только там: без
 * справочника переход не показываем журнал с чужим порогом, а объясняем почему.
 */
export function useCriticalNavigation() {
  const router = useRouter();
  const reference = useReferenceStore();

  function showCritical() {
    const high = reference.thresholds.high;
    if (high === null) {
      ElMessage.warning(THRESHOLD_UNAVAILABLE);
      return;
    }

    router.push({
      name: "predictions",
      query: {
        kind: "INCIDENT",
        activeOnly: "true",
        minProbability: String(high),
        status: "NEW",
        offset: "0",
        nav: "header",
      },
    });
  }

  return { showCritical };
}
