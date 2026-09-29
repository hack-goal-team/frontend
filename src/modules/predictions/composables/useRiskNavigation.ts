import { useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { useReferenceStore } from "@/modules/reference/store";
import { EQUIPMENT_THRESHOLD_UNAVAILABLE, THRESHOLD_UNAVAILABLE } from "@/modules/reference/consts";
import "element-plus/theme-chalk/el-message.css";

/**
 * Переходы из аналитической панели в журнал прогнозов.
 *
 * Панель и журнал (latestOnly по умолчанию) считают последний пересчёт «цель + тип
 * инцидента», поэтому число строк совпадает со счётчиком; переход помечается
 * `nav=dashboard`, и журнал это поясняет.
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

  /** «Активные риски» и «Без решения» — от MEDIUM, как считает сводка. */
  function goFromMedium(query: Record<string, string>) {
    const medium = reference.thresholds.medium;
    if (medium === null) {
      ElMessage.warning(THRESHOLD_UNAVAILABLE);
      return;
    }
    go({ activeOnly: "true", minProbability: String(medium), ...query });
  }

  function openActive() {
    goFromMedium({});
  }

  /**
   * Порог диктует справочник, временных значений на фронте нет: без `/reference-data`
   * переход не состоятелен, и мы говорим об этом прямо, а не фильтруем по выдуманному 0.7.
   * Журнал умеет фильтровать только «не ниже порога»: HIGH — от high, MEDIUM+HIGH — от medium.
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
    goFromMedium({ status: "NEW" });
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
