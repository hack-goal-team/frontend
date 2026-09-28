<script setup lang="ts">
import { usePredictionQuery } from "@/modules/predictions/composables/usePredictionQuery.ts";
import { usePredictionsQuery } from "@/modules/predictions/composables/usePredictionsQuery.ts";
import type { JournalKind, PredictionsQuery } from "@/modules/predictions/types";
import { DEFAULT_KIND } from "@/modules/predictions/consts";
import SidePanel from "@/shared/ui/SidePanel.vue";
import { computed, ref, watch, watchEffect } from "vue";
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
  minProbability: route.query.minProbability ? Number(route.query.minProbability) : undefined,
  activeOnly: route.query.activeOnly === "true" || undefined,
  latestOnly: route.query.latestOnly === "true" ? true : route.query.latestOnly === "false" ? false : undefined,
}));

const { data, isFetching, isLoading, isError, error, isPlaceholderData } = usePredictionsQuery(query);

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
      const { minProbability: _p, incidentType: _t, nav: _n, ...rest } = route.query;
      router.replace({ query: { ...rest, kind: detailKind, offset: 0 } });
    }
  },
  { immediate: true },
);

// Открыть панель
function openPanel(id: string) {
  router.replace({
    query: { ...route.query, selectedId: id },
  });
}

// Из карточки инцидента — в прогноз отказа того же датчика: push, чтобы «Назад» вернул инцидент.
// Вкладку на отказы переключит watch по виду детали.
function openRelatedPrediction(id: string) {
  router.push({ query: { ...route.query, selectedId: id } });
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

// Пришли со сводки: журнал по умолчанию (latestOnly) считает так же — последний пересчёт «цель + тип».
// Маркер называется `nav`, а не `from`: `from`/`to` отданы контракту (период по computedAt).
const fromDashboard = computed(() => route.query.nav === "dashboard");

function dismissNavHint() {
  const rest = { ...route.query };
  delete rest.nav;
  router.replace({ query: rest });
}

// Фильтры — всё, что в query сверх вкладки, пагинации, карточки и пометки перехода.
const NON_FILTER_KEYS = new Set(["kind", "limit", "offset", "selectedId", "nav", "latestOnly"]);
const hasFilters = computed(() =>
  Object.entries(route.query).some(([key, value]) => !NON_FILTER_KEYS.has(key) && value !== undefined && value !== ""),
);

/**
 * У отказов ползунка нет, но переход с карточки «Оборудование к проверке» ставит
 * minProbability = equipmentCheckThreshold: у EQUIPMENT это ровно riskLevel HIGH.
 */
const equipmentCheckOnly = computed(() => kind.value === "EQUIPMENT" && !!route.query.minProbability);

function showAllEquipment() {
  const { minProbability: _p, ...rest } = route.query;
  router.replace({ query: { ...rest, offset: 0 } });
}

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

// После смены вкладки placeholderData держит ответ прошлого вида: под колонками нового он
// смешал бы шкалы двух моделей. Вид ответа запоминаем, пока данные не placeholder.
const loadedKind = ref<JournalKind | null>(null);
watchEffect(() => {
  if (data.value && !isPlaceholderData.value) loadedKind.value = kind.value;
});
const isKindSwitching = computed(() => loadedKind.value !== null && loadedKind.value !== kind.value);

// Страница за концом выборки (разобрали строки на последней) — переходим на последнюю.
watch(data, (page) => {
  if (!page || isPlaceholderData.value || page.items.length > 0 || page.total === 0 || page.offset === 0) return;
  const last = Math.floor((page.total - 1) / page.limit) * page.limit;
  router.replace({ query: { ...route.query, offset: last } });
});

const isEmpty = computed(() => !isLoading.value && !isError.value && (data.value?.items.length ?? 0) === 0);

const total = computed(() => (isKindSwitching.value ? 0 : (data.value?.total ?? 0)));
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Журнал прогнозов</span>
  </Teleport>

  <div class="predictions-page">
    <PredictionKindSwitch v-model="kind" :disable="auth.isEmptyScope" />

    <PredictionFilters :kind="kind" :disable="auth.isEmptyScope" class="predictions-page__filters" />

    <el-alert
      v-if="fromDashboard"
      type="info"
      :closable="true"
      show-icon
      title="Переход с аналитической панели"
      description="Журнал показывает последний пересчёт каждой цели и типа инцидента — как и счётчик на панели."
      @close="dismissNavHint"
    />

    <el-alert
      v-if="route.query.nav === 'header' && route.query.status === 'NEW'"
      type="info"
      :closable="true"
      show-icon
      class="predictions-page__hint"
    >
      Показаны инциденты высокого риска без решения. Зафиксируйте решение, чтобы убрать их из счётчика в шапке.
    </el-alert>

    <el-alert
      v-if="equipmentCheckOnly"
      type="info"
      :closable="true"
      show-icon
      title="Показаны только отказы «К проверке»"
      class="predictions-page__hint"
      @close="showAllEquipment"
    />

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

    <PredictionPanelContent
      v-else-if="detail"
      :detail="detail"
      @show-on-graph="showOnGraph"
      @open-prediction="openRelatedPrediction"
    />

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
