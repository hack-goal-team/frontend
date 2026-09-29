import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useReferenceStore } from "@/modules/reference/store";
import { EQUIPMENT_THRESHOLD_UNAVAILABLE } from "@/modules/reference/consts";
import "element-plus/theme-chalk/el-message.css";

/**
 * Колокольчик в шапке: журнал отказов оборудования «к проверке» — HIGH у EQUIPMENT, то есть
 * probability ≥ equipmentCheckThreshold, последний пересчёт и только действующие, как на значке.
 * Без справочника порога нет: в журнал с выдуманным не ведём.
 */
export function useAlarmNavigation() {
  const router = useRouter();
  const reference = useReferenceStore();

  function showAlarming() {
    const threshold = reference.equipmentCheckThreshold;
    if (threshold === null) {
      ElMessage.warning(EQUIPMENT_THRESHOLD_UNAVAILABLE);
      return;
    }

    router.push({
      name: "predictions",
      query: {
        kind: "EQUIPMENT",
        activeOnly: "true",
        latestOnly: "true",
        minProbability: String(threshold),
        offset: "0",
        nav: "alarm",
      },
    });
  }

  return { showAlarming };
}
