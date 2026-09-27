import { useQuery } from "@tanstack/vue-query";
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { fetchAudit } from "../api";
import { auditKeys } from "../keys";
import type { AuditEntry, AuditQuery } from "../types";

/**
 * Журнал аудита — обычный запрос одной страницы, как `usePredictionsQuery`: `/audit` отдаёт
 * `X-Total-Count`, поэтому навигация по страницам считается от общего числа записей,
 * а `limit`/`offset` живут в URL и попадают в ключ запроса вместе с фильтрами.
 */
export function useAuditQuery(query: MaybeRefOrGetter<AuditQuery> = {}) {
  const current = computed(() => toValue(query));

  const result = useQuery({
    queryKey: computed(() => auditKeys.list(current.value)),
    queryFn: () => fetchAudit(current.value),
    placeholderData: (prev) => prev,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    data: result.data,
    items: computed<AuditEntry[]>(() => result.data.value?.items ?? []),
    total: computed(() => result.data.value?.total ?? 0),
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error,
  };
}
