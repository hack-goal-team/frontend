import { useInfiniteQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { fetchAudit } from "../api";
import { AUDIT_PAGE_SIZE } from "../consts";
import { auditKeys } from "../keys";
import type { AuditEntry, AuditFilters } from "../types";

/**
 * Журнал аудита — `useInfiniteQuery`: счётчика `X-Total-Count` у ручки нет, `hasMore` —
 * единственный признак продолжения, поэтому страницы дочитываются кнопкой «Показать ещё».
 *
 * Страницы читаются последовательно (getNextPageParam от `offset + limit` ответа) —
 * параллельное чтение offset-пагинации без обещанного порядка страницы перекроет.
 *
 * `placeholderData` нет намеренно: на бесконечном запросе он показал бы записи
 * старых фильтров под новыми (см. useObjectChannelsQuery).
 */
export function useAuditQuery(filters: MaybeRefOrGetter<AuditFilters> = {}) {
  const current = computed(() => toValue(filters));

  const query = useInfiniteQuery({
    queryKey: computed(() => auditKeys.list(current.value)),
    queryFn: ({ pageParam }) =>
      fetchAudit({ ...current.value, limit: AUDIT_PAGE_SIZE, offset: Number(pageParam ?? 0) }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.hasMore ? last.offset + last.limit : undefined),
    staleTime: 30_000,
    retry: 1,
  });

  const items = computed<AuditEntry[]>(() => query.data.value?.pages.flatMap((page) => page.items) ?? []);

  return {
    items,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isFetchingNextPage: query.isFetchingNextPage,
    isError: query.isError,
    error: query.error,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
