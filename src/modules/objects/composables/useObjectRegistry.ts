import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/modules/auth/store";
import { fetchObjects } from "../api";
import { objectsKeys } from "../keys";
import { ancestorChain, buildObjectTree } from "../lib/tree";
import { objectRiskOf } from "../lib/risk";
import type { InfrastructureObject, NodeRisk, ObjectTreeNode, ObjectsQuery } from "../types";

/**
 * Реестр на всё приложение: два ключа — с риском и без (см. `withRisk` ниже).
 *
 * Ключ НЕ зависит от level/risk/q: это клиентские проекции одного массива, и ключ,
 * зависящий от фильтров, породил бы три копии одного снапшота и рассинхрон
 * «шапка графа ↔ список». Отправка `level` на бэк вредна и содержательно — выдача
 * без родителей даёт сломанное дерево.
 *
 * Риск — серверный (`withRisk=true`): `risk` приехал вместе с объектами, свёртку
 * поддерева бэк считает сам. Отдельного скана активных прогнозов нет; по SSE
 * инвалидируются оба ключа (см. useSse.ts). Но свёртка на бэке дорогая, и потребителю,
 * которому нужен только `X-Total-Count` (карточка дашборда), её платить незачем —
 * такой потребитель приходит с `withRisk: false` и получает прочерки вместо уровней.
 */
export function useObjectRegistry({ withRisk = true }: { withRisk?: boolean } = {}) {
  const auth = useAuthStore();

  const query: ObjectsQuery = { withRisk };

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: objectsKeys.list(query),
    queryFn: () => fetchObjects(query),
    staleTime: 5 * 60_000, // снапшот реестра протухает медленно, перерисовка дерева дорогая
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    enabled: computed(() => !auth.isEmptyScope),
    retry: 1,
  });

  const items = computed<InfrastructureObject[]>(() => data.value?.items ?? []);
  const tree = computed(() => buildObjectTree(items.value));
  const roots = computed(() => tree.value.roots);
  const stats = computed(() => tree.value.stats);
  /** null — «неизвестно» (заголовка X-Total-Count нет), 0 — «реестр пуст». */
  const total = computed(() => data.value?.total ?? null);

  /** Риск узла — серверный; null, если поле `risk` в запись не пришло (прочерк). */
  function riskOf(node: ObjectTreeNode): NodeRisk | null {
    return objectRiskOf(node.object);
  }

  function objectById(id: string | null | undefined): InfrastructureObject | null {
    if (!id) return null;
    return tree.value.byId.get(id)?.object ?? null;
  }

  function nodeById(id: string | null | undefined): ObjectTreeNode | null {
    if (!id) return null;
    return tree.value.byId.get(id) ?? null;
  }

  /** Узлы-предки сверху вниз, без самого узла; `[]` — родитель в выдаче не найден. */
  function ancestorsOf(id: string): ObjectTreeNode[] {
    return ancestorChain(tree.value.byId, id);
  }

  return {
    data,
    items,
    tree,
    roots,
    stats,
    total,
    riskOf,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    objectById,
    nodeById,
    ancestorsOf,
  };
}
