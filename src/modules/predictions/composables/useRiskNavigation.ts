import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useReferenceStore } from "@/modules/reference/store";
import { EQUIPMENT_THRESHOLD_UNAVAILABLE, THRESHOLD_UNAVAILABLE } from "@/modules/reference/consts";
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
    // Сводка — про инциденты: без kind порог HIGH поднял бы и отказы с той же вероятностью.
    router.push({ name: "predictions", query: { kind: "INCIDENT", ...query, offset: "0", nav: "dashboard" } });
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

  /**
   * «К проверке» = HIGH у EQUIPMENT, то есть probability ≥ equipmentCheckThreshold — фильтр
   * ровно на число карточки. Без справочника порога нет: не ведём в журнал с выдуманным.
   */
  function openEquipment() {
    const threshold = reference.equipmentCheckThreshold;
    if (threshold === null) {
      ElMessage.warning(EQUIPMENT_THRESHOLD_UNAVAILABLE);
      return;
    }
    // latestOnly — как считает сводка (последний пересчёт «цель + тип»): строк ровно EQUIPMENT.HIGH.
    go({ kind: "EQUIPMENT", activeOnly: "true", latestOnly: "true", minProbability: String(threshold) });
  }

  return { openActive, openCritical, openUnreviewed, openEquipment };
}
