<script setup lang="ts">
import { usePredictionQuery } from "@/modules/predictions/composables/usePredictionQuery.ts";
import { usePredictionsQuery } from "@/modules/predictions/composables/usePredictionsQuery.ts";
import type { PredictionsQuery } from "@/modules/predictions/types";
import SidePanel from "@/shared/ui/SidePanel.vue";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import PredictionFilters from "./components/PredictionFilters.vue";
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

const query = computed<PredictionsQuery>(() => ({
  limit: Number(route.query.limit ?? 50),
  offset: Number(route.query.offset ?? 0),
  incidentType: (route.query.incidentType as string) || undefined,
  status: (route.query.status as PredictionsQuery["status"]) || undefined,
  minProbability: route.query.minProbability ? Number(route.query.minProbability) : undefined,
  activeOnly: route.query.activeOnly === "true" || undefined,
}));

const { data, isFetching, isLoading, isError, error } = usePredictionsQuery(query);

const selectedId = computed(() => (route.query.selectedId as string) ?? null);
const isPanelOpen = computed(() => !!selectedId.value);

// Детали выбранного прогноза
const {
  data: detail,
  isLoading: isDetailLoading,
  isError: isDetailError,
  error: detailError,
} = usePredictionQuery(selectedId);

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

// Пришли со сводки аналитической панели — там счётчики дедуплицированы по «цель + тип»
const fromDashboard = computed(() => route.query.from === "dashboard");

function dismissDedupNotice() {
  const rest = { ...route.query };
  delete rest.from;
  router.replace({ query: rest });
}

const isEmpty = computed(() => !isLoading.value && !isError.value && (data.value?.items.length ?? 0) === 0);

const total = computed(() => data.value?.total ?? 0);
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Журнал прогнозов</span>
  </Teleport>

  <div class="predictions-page">
    <PredictionFilters :disable="auth.isEmptyScope" class="predictions-page__filters" />

    <el-alert
      v-if="fromDashboard"
      type="info"
      :closable="true"
      show-icon
      title="Показаны все строки журнала"
      description="На аналитической панели счётчики дедуплицированы по сочетанию «цель + тип инцидента», поэтому строк здесь может быть больше."
      @close="dismissDedupNotice"
    />

    <el-alert
      v-if="route.query.from === 'header' && route.query.status === 'NEW'"
      type="info"
      :closable="true"
      show-icon
      class="predictions-page__hint"
    >
      Показаны прогнозы высокого риска без решения. Зафиксируйте решение, чтобы убрать их из счётчика в шапке.
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

      <PredictionTableSkeleton v-else-if="isLoading" :rows="20" />

      <el-empty
        v-else-if="!isLoading && (!data?.items || data.items.length === 0)"
        description="Прогнозов нет"
        class="predictions-page__empty"
      />

      <PredictionTable v-else :items="data?.items ?? []" :loading="isFetching" @row-click="openPanel" />
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

    <PredictionPanelContent v-else-if="detail" :detail="detail" />

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
