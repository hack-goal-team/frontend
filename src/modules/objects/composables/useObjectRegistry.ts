import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/modules/auth/store";
import { fetchObjects } from "../api";
import { objectsKeys } from "../keys";
import { RISK_DERIVED_NOTE, RISK_UNSUPPORTED_HINT } from "../consts";
import { ancestorChain, buildObjectTree } from "../lib/tree";
import { detectRiskSupport, resolveRisk, rollUpRisks } from "../lib/risk";
import type { InfrastructureObject, NodeRisk, ObjectTreeNode, ObjectsQuery } from "../types";
import { useActiveRiskMap } from "./useActiveRiskMap";

/**
 * Единственный запрос реестра на приложение.
 *
 * Ключ НЕ зависит от level/risk/q: это клиентские проекции одного массива, и ключ,
 * зависящий от фильтров, породил бы три копии одного снапшота и рассинхрон
 * «шапка графа ↔ список». Отправка `level` на бэк вредна и содержательно — выдача
 * без родителей даёт сломанное дерево.
 *
 * `withRisk: true` шлём всегда: параметр принимается, поле просто не приходит.
 * Когда бэк доделает реализацию, риск в списке появится без правок фронта.
 *
 * Реестр — снапшот (ADR-015), по SSE он НЕ инвалидируется; инвалидируется только
 * `objectsKeys.riskMap()` (см. useSse.ts).
 */
export function useObjectRegistry(options: { withRisks?: boolean } = {}) {
  /**
   * `withRisks: false` — для потребителей, которым нужно только число записей
   * (карточка дашборда): скан активных прогнозов тогда не запускается.
   */
  const withRisks = options.withRisks ?? true;
  const auth = useAuthStore();

  const query: ObjectsQuery = { withRisk: true };

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
  const riskSupport = computed(() => detectRiskSupport(items.value));

  /**
   * Скан активных прогнозов нужен только пока реестр не отдаёт `risk`.
   * Как только `withRisk` дорааст, `riskSupport` станет "supported" и скан сам выключится.
   */
  const scan = useActiveRiskMap({
    enabled: computed(() => withRisks && riskSupport.value !== "supported"),
  });

  const rolledRisks = computed(() => rollUpRisks(roots.value, scan.byObject.value));

  /** Риск узла по фолбэк-цепочке «реестр → производный → недоступен». Правило — в resolveRisk. */
  function riskOf(node: ObjectTreeNode): NodeRisk | null {
    return resolveRisk({
      registryRisk: node.object.risk,
      support: riskSupport.value,
      derived: rolledRisks.value.get(node.id),
      coverage: scan.coverage.value,
    });
  }

  /**
   * Подпись источника риска для подписи колонки: диспетчер обязан видеть,
   * что уровень выведен, а не прислан сервисом.
   */
  const riskNote = computed<string | null>(() => {
    if (riskSupport.value === "supported") return null;
    if (scan.coverage.value === "none") return RISK_UNSUPPORTED_HINT;
    return RISK_DERIVED_NOTE;
  });

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
    riskSupport,
    riskCoverage: scan.coverage,
    riskScanned: scan.scanned,
    riskScanPages: scan.pages,
    riskUnattributed: scan.unattributed,
    riskNote,
    riskOf,
    riskByChannel: scan.byChannel,
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
