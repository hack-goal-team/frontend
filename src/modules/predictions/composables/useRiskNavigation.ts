import { useRouter } from "vue-router";
import { useReferenceStore } from "@/modules/reference/store";

/**
 * Переходы из аналитической панели в журнал прогнозов.
 *
 * Панель считает сводку по уникальному сочетанию «цель + тип инцидента», журнал —
 * по строкам, поэтому каждый переход помечается `from=dashboard`: страница журнала
 * показывает пояснение, иначе расхождение счётчика и числа строк выглядит как баг.
 */
export function useRiskNavigation() {
  const router = useRouter();
  const reference = useReferenceStore();

  function go(query: Record<string, string>) {
    router.push({ name: "predictions", query: { ...query, offset: "0", from: "dashboard" } });
  }

  function openActive() {
    go({ activeOnly: "true" });
  }

  /**
   * Порог диктует справочник, фолбэком — то же временное значение из контракта
   * (справочник грузится асинхронно). Переход есть только у HIGH: журнал умеет
   * фильтровать «не ниже порога», верхней границы в контракте нет — MEDIUM
   * неотделим от HIGH, а LOW от остальных.
   */
  function openCritical() {
    go({ activeOnly: "true", minProbability: String(reference.data?.riskThresholds.high ?? 0.7) });
  }

  function openUnreviewed() {
    go({ activeOnly: "true", status: "NEW" });
  }

  return { openActive, openCritical, openUnreviewed };
}
