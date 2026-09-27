import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useReferenceStore } from "@/modules/reference/store";
import { THRESHOLD_UNAVAILABLE } from "@/modules/reference/consts";
import "element-plus/theme-chalk/el-message.css";

/**
 * Переходы из аналитической панели в журнал прогнозов.
 *
 * Панель считает сводку по уникальному сочетанию «цель + тип инцидента», журнал —
 * по строкам, поэтому каждый переход помечается `nav=dashboard`: страница журнала
 * показывает пояснение, иначе расхождение счётчика и числа строк выглядит как баг.
 * Параметр называется `nav`, а не `from`: `from` в контракте — начало периода, и
 * помеченный им переход улетел бы на бэк как некорректная дата.
 */
export function useRiskNavigation() {
  const router = useRouter();
  const reference = useReferenceStore();

  function go(query: Record<string, string>) {
    router.push({ name: "predictions", query: { ...query, offset: "0", nav: "dashboard" } });
  }

  function openActive() {
    go({ activeOnly: "true" });
  }

  /**
   * Порог диктует справочник, временных значений на фронте нет: без `/reference-data`
   * переход не состоятелен, и мы говорим об этом прямо, а не фильтруем по выдуманному 0.7.
   * Переход есть только у HIGH: журнал умеет фильтровать «не ниже порога», верхней границы
   * в контракте нет — MEDIUM неотделим от HIGH, а LOW от остальных.
   */
  function openCritical() {
    const high = reference.thresholds.high;
    if (high === null) {
      ElMessage.warning(THRESHOLD_UNAVAILABLE);
      return;
    }

    go({ activeOnly: "true", minProbability: String(high) });
  }

  function openUnreviewed() {
    go({ activeOnly: "true", status: "NEW" });
  }

  return { openActive, openCritical, openUnreviewed };
}
