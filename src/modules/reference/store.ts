import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { fetchReferenceData } from "./api";
import type { ReferenceData } from "./types";

export const useReferenceStore = defineStore("reference", () => {
  const data = ref<ReferenceData | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  // Справочник грузит guard роутера, а навигации могут пересекаться: кто пришёл
  // во время полёта — ждёт этот же запрос, а не плодит новый. После ошибки data
  // остаётся null, поэтому следующая навигация попробует снова.
  let inflight: Promise<void> | null = null;

  function load(): Promise<void> {
    if (data.value) return Promise.resolve();
    inflight ??= fetchOnce();
    return inflight;
  }

  // Единственный источник порогов риска для фронта: фолбэков здесь нет намеренно,
  // null читается как «порог неизвестен», а не как временное 0.4/0.7 из контракта.
  const thresholds = computed<{ medium: number | null; high: number | null }>(() => ({
    medium: data.value?.riskThresholds.medium ?? null,
    high: data.value?.riskThresholds.high ?? null,
  }));

  // Горизонт модели диктует сервис, на /settings он только для чтения: подставить
  // вместо него «обычные 24» значит объяснять отсутствие прогноза чужим сроком.
  const horizonHours = computed<number | null>(() => data.value?.predictionHorizonHours ?? null);

  async function fetchOnce(): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetchReferenceData();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
      inflight = null;
    }
  }

  /**
   * Админ сохранил новые пороги на /settings. Текущие значения не обнуляем: до ответа
   * справочника фильтрам есть на что опереться, а окна «порога нет» на секунду не будет.
   */
  function reload(): Promise<void> {
    return fetchOnce();
  }

  return { data, loading, error, thresholds, horizonHours, load, reload };
});
