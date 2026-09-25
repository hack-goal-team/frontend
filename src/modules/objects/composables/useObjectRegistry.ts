import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";
import { useAuthStore } from "@/modules/auth/store";
import { fetchObjects } from "../api";
import { objectsKeys } from "../keys";
import { RISK_DERIVED_NOTE, RISK_DERIVED_SHORT } from "../consts";
import { ancestorChain, buildObjectTree } from "../lib/tree";
import { resolveRisk, rollUpRisks } from "../lib/risk";
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
 * Риска в `/objects` контракт v0 не несёт (ни поля `risk`, ни параметра `withRisk`),
 * поэтому риск узла — всегда производный, из скана `/predictions?activeOnly=true`.
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

  const query: ObjectsQuery = {};

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

  /** Скан по всей области видимости: свёртку поддерева узла иначе не посчитать. */
  const scan = useActiveRiskMap({ enabled: withRisks });

  const rolledRisks = computed(() => rollUpRisks(roots.value, scan.byObject.value));

  /** Риск узла — свёртка его поддерева из скана; null, пока скан не завершился (см. resolveRisk). */
  function riskOf(node: ObjectTreeNode): NodeRisk | null {
    return resolveRisk({
      derived: rolledRisks.value.get(node.id),
      coverage: scan.coverage.value,
      hasUnattributed: scan.unattributed.value > 0,
    });
  }

  /**
   * Подпись источника риска. Развёрнутая — для постоянной подписи над таблицей, короткая —
   * для шапки колонки, где длинный текст не помещается. `null` — пояснять нечего: скан
   * упал — тогда говорит el-alert с кнопкой «Повторить» (`riskUnavailable`), и дублировать
   * его текст в подписи нельзя.
   */
  const riskNote = computed(() => (scan.coverage.value === "none" ? null : RISK_DERIVED_NOTE));
  const riskNoteShort = computed(() => (scan.coverage.value === "none" ? null : RISK_DERIVED_SHORT));

  /**
   * Скан не отработал. Про это имеем право сказать только после первой попытки — на лету
   * (`isLoading`) решения ещё нет, а повтор от уже упавшего скана обязан оставаться
   * на экране, иначе кнопка «Повторить» исчезнет в момент нажатия.
   */
  const riskUnavailable = computed(() => scan.coverage.value === "none" && !scan.isLoading.value);

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
    riskCoverage: scan.coverage,
    riskScanned: scan.scanned,
    riskScanPages: scan.pages,
    riskScanBusy: scan.isFetching,
    riskUnattributed: scan.unattributed,
    riskNote,
    riskNoteShort,
    riskUnavailable,
    refetchRiskMap: scan.refetch,
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
