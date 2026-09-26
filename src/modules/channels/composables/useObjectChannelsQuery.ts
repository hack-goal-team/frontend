import { useInfiniteQuery } from "@tanstack/vue-query";
import { computed, ref, toValue, type MaybeRefOrGetter } from "vue";
import { useAuthStore } from "@/modules/auth/store";
import { CHANNEL_PAGE_SIZE, HIGHLIGHT_SCAN_MAX_PAGES } from "@/modules/objects/consts";
import { fetchChannels } from "../api";
import { channelsKeys } from "../keys";
import { mergeChannelPages } from "../lib/mergeChannelPages";
import type { Channel } from "../types";

/**
 * Чем закончился поиск канала для `?highlightChannel=`:
 * `found` — канал в загруженных страницах, `not-found` — страницы кончились, его нет,
 * `truncated` — упёрлись в стоп-кран, `aborted` — адрес сменился в середине скана.
 */
export type HighlightScanOutcome = "found" | "not-found" | "truncated" | "aborted";

export interface ObjectChannelsOptions {
  /** Уровень 3 (у комплекса каналов по контракту нет) и неизвестный `objectId` — решает вызывающая сторона. */
  enabled?: MaybeRefOrGetter<boolean>;
}

/**
 * Каналы одного объекта — `useInfiniteQuery`.
 *
 * Страницы читаются ПОСЛЕДОВАТЕЛЬНО: `getNextPageParam` берёт `offset + limit` из ответа
 * и следующий запрос стартует только после текущего. Параллельного чтения offset-пагинация
 * без обещанного `ORDER BY` не терпит — страницы перекроют друг друга.
 *
 * `placeholderData` здесь НЕТ намеренно: на бесконечном запросе он показал бы каналы
 * предыдущего объекта под названием нового, а это худший вид лжи на этом экране.
 */
export function useObjectChannelsQuery(
  objectId: MaybeRefOrGetter<string | null | undefined>,
  options: ObjectChannelsOptions = {},
) {
  const auth = useAuthStore();
  const id = computed(() => toValue(objectId) ?? "");

  const enabled = computed(
    () => id.value !== "" && (options.enabled === undefined ? true : toValue(options.enabled)) && !auth.isEmptyScope,
  );

  const query = useInfiniteQuery({
    queryKey: computed(() => channelsKeys.byObject(id.value)),
    queryFn: ({ pageParam }) =>
      fetchChannels({
        objectId: id.value,
        // Риск канала — серверный (ChannelRisk с predictionId): отдельный скан прогнозов не нужен.
        withRisk: true,
        limit: CHANNEL_PAGE_SIZE,
        offset: Number(pageParam ?? 0),
      }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled,
    retry: 1,
  });

  const merged = computed(() => mergeChannelPages(query.data.value?.pages));
  const items = computed<Channel[]>(() => merged.value.items);

  function indexOf(channelId: string): number {
    return items.value.findIndex((channel) => channel.id === channelId);
  }

  const pageTotal = computed(() => query.data.value?.pages.length ?? 0);
  /** Сколько страниц придётся прочитать, чтобы закрыть объект целиком; null — счётчика нет. */
  const pagesNeeded = computed(() =>
    merged.value.total === null ? null : Math.ceil(merged.value.total / CHANNEL_PAGE_SIZE),
  );

  const isScanning = ref(false);
  /** Смена адреса в середине скана: старый цикл обязан остановиться, иначе два скана спорят за кэш. */
  let scanSeq = 0;

  /**
   * Последовательная догрузка `/channels`, пока канал не встретился, страницы не кончатся
   * или не упрёмся в `HIGHLIGHT_SCAN_MAX_PAGES`. Линейный скан — догадка, а не решение:
   * как только бэк даст `channelId`-фильтр (см. § 13 плана), он сворачивается в один запрос.
   */
  async function scanFor(channelId: string): Promise<HighlightScanOutcome> {
    const seq = ++scanSeq;
    if (indexOf(channelId) >= 0) return "found";

    isScanning.value = true;
    try {
      while (seq === scanSeq) {
        if (!query.hasNextPage.value) return "not-found";
        if (pageTotal.value >= HIGHLIGHT_SCAN_MAX_PAGES) return "truncated";

        await query.fetchNextPage();
        if (indexOf(channelId) >= 0) return "found";
      }
      return "aborted";
    } finally {
      if (seq === scanSeq) isScanning.value = false;
    }
  }

  /** Подпись прогресса в духе скана риска: «4 из 12»; «?» — когда X-Total-Count не приходил. */
  const scanPages = computed(() => (pageTotal.value ? `${pageTotal.value} из ${pagesNeeded.value ?? "?"}` : null));

  return {
    items,
    total: computed(() => merged.value.total),
    hasMore: computed(() => merged.value.hasMore),
    duplicates: computed(() => merged.value.duplicates),
    pageTotal,
    pagesNeeded,
    scanPages,
    isScanning,
    indexOf,
    scanFor,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
