import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useAuthStore } from "@/modules/auth/store";
import { fetchPredictions } from "@/modules/predictions/api";
import type { Prediction } from "@/modules/predictions/types";
import { RISK_SCAN_MAX_PAGES, RISK_SCAN_PAGE_SIZE } from "../consts";
import { objectsKeys } from "../keys";
import { buildRiskMaps, type RiskMaps } from "../lib/risk";
import type { RiskCoverage } from "../types";

export interface RiskScan extends RiskMaps {
  coverage: RiskCoverage;
  /** Прочитано страниц — вместе с `pagesNeeded` даёт подпись прогресса. */
  pages: number;
  /** null — сервиса без X-Total-Count либо заголовок = 0: планировать число страниц нельзя. */
  pagesNeeded: number | null;
  scanned: number;
}

/**
 * Адаптивный скан `/predictions?activeOnly=true`.
 *
 * Страницы идут ПОСЛЕДОВАТЕЛЬНО: offset-пагинация без обещанного ORDER BY параллельного
 * чтения не терпит (страницы пересекаются). Число страниц считается от `X-Total-Count`
 * первого ответа, а завершает цикл `hasMore === false` — `RISK_SCAN_MAX_PAGES` только
 * страхует от незавершимости и включает `coverage: "partial"`.
 *
 * `total` у `fetchPredictions` не различает «0» и «заголовка нет» (файл правке не подлежит),
 * поэтому на прогресс он идёт только когда строго больше нуля.
 */
export async function scanActivePredictions(): Promise<RiskScan> {
  const limit = RISK_SCAN_PAGE_SIZE;
  const items: Prediction[] = [];

  let offset = 0;
  let pages = 0;
  let pagesNeeded: number | null = null;
  let hasMore = true;
  let truncated = false;

  while (hasMore) {
    const page = await fetchPredictions({ activeOnly: true, limit, offset });
    items.push(...(page.items ?? []));
    pages += 1;
    hasMore = page.hasMore === true;
    pagesNeeded = page.total > 0 ? Math.ceil(page.total / limit) : null;
    offset += limit;

    if (hasMore && pages >= RISK_SCAN_MAX_PAGES) {
      truncated = true;
      break;
    }
  }

  return {
    ...buildRiskMaps(items),
    coverage: truncated ? "partial" : "complete",
    pages,
    pagesNeeded,
    scanned: items.length,
  };
}

/**
 * Карта риска из АКТИВНЫХ прогнозов. Инвалидируется по SSE (см. useSse.ts): производный
 * риск построен именно на них, а снапшот реестра — нет.
 *
 * `enabled` даёт вызывающая сторона: скан не нужен, когда реестр сам отдаёт `risk`.
 */
export function useActiveRiskMap(options: { enabled?: MaybeRefOrGetter<boolean> } = {}) {
  const auth = useAuthStore();

  const enabled = computed(
    () => (options.enabled === undefined ? true : toValue(options.enabled)) && !auth.isEmptyScope,
  );

  const { data, isLoading, isFetching, isError, error } = useQuery({
    queryKey: objectsKeys.riskMap(),
    queryFn: scanActivePredictions,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    enabled,
    retry: 1,
  });

  const empty: RiskMaps = { byObject: new Map(), byChannel: new Map(), unattributed: 0 };

  const byObject = computed(() => data.value?.byObject ?? empty.byObject);
  const byChannel = computed(() => data.value?.byChannel ?? empty.byChannel);
  const unattributed = computed(() => data.value?.unattributed ?? 0);

  /**
   * Пока скан не отработал, полноты нет: "none" заставляет `resolveRisk` вернуть null,
   * и UI показывает «нет данных», а не ○ «без прогноза» на каждом объекте.
   */
  const coverage = computed<RiskCoverage>(() => data.value?.coverage ?? "none");
  const scanned = computed(() => data.value?.scanned ?? 0);
  const pages = computed(() => (data.value ? `${data.value.pages} из ${data.value.pagesNeeded ?? "?"}` : null));

  return { data, byObject, byChannel, unattributed, coverage, scanned, pages, isLoading, isFetching, isError, error };
}
