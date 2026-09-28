import { useRouter } from "vue-router";

/**
 * Навигация на таблицу прогнозов с фильтром «датчик в тревоге без решения».
 * Порог вероятности не участвует: `alarming` — факт по `currentState`, а не риск,
 * поэтому переход состоятелен и без справочника.
 */
export function useAlarmNavigation() {
  const router = useRouter();

  function showAlarming() {
    router.push({
      name: "predictions",
      query: {
        alarming: "true",
        status: "NEW",
        offset: "0",
        nav: "alarm",
      },
    });
  }

  return { showAlarming };
}
