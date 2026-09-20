<script setup lang="ts">
import ChangesBanner from "@/modules/notifications/components/ChangesBanner.vue";
import { useNotificationsStore } from "@/modules/notifications/store.ts";
import { useCriticalNavigation } from "@/modules/notifications/useCriticalNavigation.ts";
import { usePredictionQuery } from "@/modules/predictions/composables/usePredictionQuery.ts";
import { usePredictionsQuery } from "@/modules/predictions/composables/usePredictionsQuery.ts";
import { predictionKeys } from "@/modules/predictions/keys.ts";
import type { PredictionsQuery } from "@/modules/predictions/types";
import SidePanel from "@/shared/ui/SidePanel.vue";
import { useQueryClient } from "@tanstack/vue-query";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import PredictionFilters from "./components/PredictionFilters.vue";
import PredictionPagination from "./components/PredictionPagination.vue";
import PredictionPanelContent from "./components/PredictionPanelContent.vue";
import PredictionTable from "./components/PredictionTable.vue";
import { useAuthStore } from "@/modules/auth/store.ts";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const queryClient = useQueryClient();
const store = useNotificationsStore();
const { showCritical } = useCriticalNavigation();

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

function onReload() {
  queryClient.invalidateQueries({ queryKey: predictionKeys.lists() });
  store.clearNewPredictions();
}

function onShowCritical() {
  showCritical();
  store.clearNewPredictions();
}

const isEmpty = computed(() => !isLoading.value && !isError.value && (data.value?.items.length ?? 0) === 0);

const total = computed(() => {
  const offset = query.value.offset ?? 0;
  const loaded = data.value?.items.length ?? 0;
  const hasMore = data.value?.hasMore ?? false;
  return offset + loaded + (hasMore ? 1 : 0);
});
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Прогнозы</span>
  </Teleport>

  <div class="predictions-page">
    <PredictionFilters :disable="auth.isEmptyScope" class="predictions-page__filters" />

    <ChangesBanner @reload="onReload" @show-critical="onShowCritical" />

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
    :title="detail?.prediction.incidentType ?? 'Прогноз'"
    :loading="isDetailLoading"
    size="600px"
    @close="closePanel"
  >
    <el-alert
      v-if="isDetailError"
      type="error"
      :title="`Ошибка загрузки: ${(detailError as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <template v-else-if="detail">
      <PredictionPanelContent :detail="detail" />
    </template>
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
