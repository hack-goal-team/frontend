<script setup lang="ts">
import { usePredictionQuery } from "@/modules/predictions/composables/usePredictionQuery.ts";
import { usePredictionsQuery } from "@/modules/predictions/composables/usePredictionsQuery.ts";
import type { JournalKind, PredictionsQuery } from "@/modules/predictions/types";
import { DEFAULT_KIND } from "@/modules/predictions/consts";
import SidePanel from "@/shared/ui/SidePanel.vue";
import { computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import PredictionFilters from "./components/PredictionFilters.vue";
import PredictionKindSwitch from "./components/PredictionKindSwitch.vue";
import PredictionPagination from "./components/PredictionPagination.vue";
import PredictionPanelContent from "./components/PredictionPanelContent.vue";
import PredictionTable from "./components/PredictionTable.vue";
import { useAuthStore } from "@/modules/auth/store.ts";
import { useLabels } from "@/modules/reference/composables/useLabels";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import PredictionPanelSkeleton from "./components/skeletons/PredictionPanelSkeleton.vue";
import PredictionTableSkeleton from "./components/skeletons/PredictionTableSkeleton.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const { incidentTypeLabel } = useLabels();

/**
 * Вкладка — вид прогноза: журнал никогда не просит оба вида сразу, иначе вероятности двух
 * моделей встали бы в одну сортировку. Общие фильтры (период, тип датчика, статус) переживают
 * смену вкладки, а порог вероятности, тип, карточка и пометка перехода относятся к старой.
 */
const kind = computed<JournalKind>({
  get: () => (route.query.kind === "EQUIPMENT" ? "EQUIPMENT" : DEFAULT_KIND),
  set: (v) => {
    const { minProbability: _p, incidentType: _t, selectedId: _s, nav: _n, ...rest } = route.query;
    router.replace({ query: { ...rest, kind: v, offset: 0 } });
  },
});

const query = computed<PredictionsQuery>(() => ({
  kind: kind.value,
  limit: Number(route.query.limit ?? 50),
  offset: Number(route.query.offset ?? 0),
  from: (route.query.from as string) || undefined,
  to: (route.query.to as string) || undefined,
  incidentType: (route.query.incidentType as string) || undefined,
  sensorType: (route.query.sensorType as string) || undefined,
  alarming: route.query.alarming === "true" ? true : route.query.alarming === "false" ? false : undefined,
  status: (route.query.status as PredictionsQuery["status"]) || undefined,
  minProbability:
    kind.value === "INCIDENT" && route.query.minProbability ? Number(route.query.minProbability) : undefined,
  activeOnly: route.query.activeOnly === "true" || undefined,
}));

const { data, isFetching, isLoading, isError, error, isPlaceholderData } = usePredictionsQuery(query);

// Счётчик второй вкладки — тот же запрос другого вида с limit=1, число берётся из X-Total-Count.
const otherKind = computed<JournalKind>(() => (kind.value === "INCIDENT" ? "EQUIPMENT" : "INCIDENT"));
const otherQuery = computed<PredictionsQuery>(() => ({
  ...query.value,
  kind: otherKind.value,
  minProbability: undefined,
  limit: 1,
  offset: 0,
}));
const { data: otherData, isPlaceholderData: isOtherPlaceholder } = usePredictionsQuery(otherQuery);

// Пока ответ прошлый (placeholderData), число принадлежит другим фильтрам — не показываем.
const kindCounts = computed<Partial<Record<JournalKind, number>>>(() => ({
  [kind.value]: isPlaceholderData.value ? undefined : data.value?.total,
  [otherKind.value]: isOtherPlaceholder.value ? undefined : otherData.value?.total,
}));

const selectedId = computed(() => (route.query.selectedId as string) ?? null);
const isPanelOpen = computed(() => !!selectedId.value);

// Детали выбранного прогноза
const {
  data: detail,
  isLoading: isDetailLoading,
  isError: isDetailError,
  error: detailError,
} = usePredictionQuery(selectedId);

// Неизвестный kind в ссылке читается как INCIDENT — и в URL заменяется на него же.
watch(
  () => route.query.kind,
  (raw) => {
    if (raw !== undefined && raw !== "INCIDENT" && raw !== "EQUIPMENT") {
      router.replace({ query: { ...route.query, kind: DEFAULT_KIND } });
    }
  },
  { immediate: true },
);

// Карточку открыли ссылкой из другой вкладки (граф, старая ссылка) — вкладка догоняет прогноз.
watch(
  () => detail.value?.prediction.kind,
  (detailKind) => {
    if ((detailKind === "INCIDENT" || detailKind === "EQUIPMENT") && detailKind !== kind.value) {
      const { minProbability: _p, incidentType: _t, ...rest } = route.query;
      router.replace({ query: { ...rest, kind: detailKind, offset: 0 } });
    }
  },
);

// Открыть панель
function openPanel(id: string) {
  router.replace({
    query: { ...route.query, selectedId: id },
  });
}

// Закрыть панель
function closePanel() {
  const rest = { ...route.query };
  delete rest.selectedId;
  router.replace({ query: rest });
}

/**
 * На граф объекта — push, а не replace: список прогнозов с его фильтрами должен остаться
 * в истории. Канал передаётся подсветкой, только когда прогноз к нему привязан.
 */
function showOnGraph(objectId: string, channelId?: string) {
  router.push({
    name: "object-graph",
    params: { id: objectId },
    query: channelId ? { highlightChannel: channelId } : {},
  });
}

// Пришли со сводки аналитической панели — там счётчики дедуплицированы по «цель + тип».
// Маркер называется `nav`, а не `from`: `from`/`to` отданы контракту (период по computedAt).
const fromDashboard = computed(() => route.query.nav === "dashboard");

function dismissNavHint() {
  const rest = { ...route.query };
  delete rest.nav;
  router.replace({ query: rest });
}

// Фильтры — всё, что в query сверх вкладки, пагинации, карточки и пометки перехода.
const NON_FILTER_KEYS = new Set(["kind", "limit", "offset", "selectedId", "nav"]);
const hasFilters = computed(() =>
  Object.entries(route.query).some(([key, value]) => !NON_FILTER_KEYS.has(key) && value !== undefined && value !== ""),
);

const emptyText = computed(() => {
  if (hasFilters.value) return { title: "Нет прогнозов по выбранным фильтрам", hint: "" };
  return kind.value === "INCIDENT"
    ? {
        title: "Прогнозов инцидентов нет",
        hint: "Модель считает пожар, подтопление, загазованность и проникновение по каналам соответствующих датчиков",
      }
    : { title: "Прогнозов оборудования нет", hint: "Датчиков в зоне риска отказа не найдено" };
});

function resetFilters() {
  router.replace({ query: { kind: kind.value } });
}

// После смены вкладки placeholderData держит строки прошлого вида: под колонками нового
// они смешали бы шкалы двух моделей, поэтому до ответа показываем скелетон.
const isKindSwitching = computed(
  () => isPlaceholderData.value && (data.value?.items ?? []).some((p) => p.kind !== kind.value),
);

const isEmpty = computed(() => !isLoading.value && !isError.value && (data.value?.items.length ?? 0) === 0);

const total = computed(() => data.value?.total ?? 0);
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Журнал прогнозов</span>
  </Teleport>

  <div class="predictions-page">
    <PredictionKindSwitch v-model="kind" :counts="kindCounts" :disable="auth.isEmptyScope" />

    <PredictionFilters :kind="kind" :disable="auth.isEmptyScope" class="predictions-page__filters" />

    <el-alert
      v-if="fromDashboard"
      type="info"
      :closable="true"
      show-icon
      title="Показаны все строки журнала"
      description="На аналитической панели счётчики дедуплицированы по сочетанию «цель + тип инцидента», поэтому строк здесь может быть больше."
      @close="dismissNavHint"
    />

    <el-alert
      v-if="route.query.nav === 'header' && route.query.status === 'NEW'"
      type="info"
      :closable="true"
      show-icon
      class="predictions-page__hint"
    >
      Показаны прогнозы высокого риска без решения. Зафиксируйте решение, чтобы убрать их из счётчика в шапке.
    </el-alert>

    <el-alert v-if="route.query.nav === 'alarm'" type="info" :closable="true" show-icon class="predictions-page__hint">
      Показаны прогнозы с датчиком в тревоге без решения. Зафиксируйте решение, чтобы убрать их из счётчика-колокольчика
      в шапке.
    </el-alert>

    <el-card
      class="predictions-page__table"
      shadow="never"
      :body-style="{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }"
    >
      <EmptyScopeNotice v-if="auth.isEmptyScope" />

      <el-alert
        v-if="isError"
        type="error"
        :title="`Ошибка загрузки: ${(error as Error)?.message ?? 'неизвестно'}`"
        :closable="false"
        show-icon
      />

      <PredictionTableSkeleton v-else-if="isLoading || isKindSwitching" :rows="25" />

      <el-empty
        v-else-if="!isLoading && (!data?.items || data.items.length === 0)"
        :description="emptyText.title"
        class="predictions-page__empty"
      >
        <p v-if="emptyText.hint" class="predictions-page__empty-hint">{{ emptyText.hint }}</p>
        <el-button v-if="hasFilters" @click="resetFilters">Сбросить фильтры</el-button>
      </el-empty>

      <PredictionTable v-else :kind="kind" :items="data?.items ?? []" :loading="isFetching" @row-click="openPanel" />
    </el-card>

    <div class="predictions-page__pagination">
      <PredictionPagination
        :disable="auth.isEmptyScope || isEmpty || isLoading || isFetching || isError"
        :total="total"
      />
    </div>
  </div>

  <SidePanel
    :visible="isPanelOpen"
    :title="detail ? incidentTypeLabel(detail.prediction.incidentType) : 'Прогноз'"
    size="600px"
    @close="closePanel"
  >
    <PredictionPanelSkeleton v-if="isDetailLoading" />

    <el-alert
      v-else-if="isDetailError"
      type="error"
      :title="`Ошибка загрузки: ${(detailError as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <PredictionPanelContent v-else-if="detail" :detail="detail" @show-on-graph="showOnGraph" />

    <el-empty v-else description="Данные недоступны" />
  </SidePanel>
</template>

<style scoped>
.predictions-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.predictions-page__filters {
  flex-shrink: 0;
}

.predictions-page__table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-color: var(--el-border-color-lighter);
  overflow: hidden;
}

.predictions-page__table :deep(.el-card__body) {
  overflow: auto;
}

.predictions-page__empty {
  flex: 1;
}

.predictions-page__empty-hint {
  margin: 0;
  max-width: 420px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.predictions-page__pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  min-height: 32px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
