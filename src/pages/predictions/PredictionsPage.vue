<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { usePredictionsQuery } from "@/modules/predictions/composables/usePredictionsQuery.ts";
import PredictionTable from "./components/PredictionTable.vue";
import PredictionFilters from "./components/PredictionFilters.vue";
import PredictionPagination from "./components/PredictionPagination.vue";
import type { PredictionsQuery } from "@/modules/predictions/types";

const route = useRoute();

const query = computed<PredictionsQuery>(() => ({
  limit: Number(route.query.limit ?? 50),
  offset: Number(route.query.offset ?? 0),
  incidentType: (route.query.incidentType as string) || undefined,
  status: (route.query.status as PredictionsQuery["status"]) || undefined,
  minProbability: route.query.minProbability ? Number(route.query.minProbability) : undefined,
  activeOnly: route.query.activeOnly === "true" || undefined,
}));

const { data, isFetching, isLoading, isError, error } = usePredictionsQuery(query);

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

  <div class="predictions-table">
    <div class="filters">
      <PredictionFilters />
    </div>

    <div class="table">
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
        class="empty"
      />

      <PredictionTable v-else :items="data?.items ?? []" :loading="isFetching" />
    </div>

    <div v-if="!isEmpty && !isLoading" class="pagination">
      <PredictionPagination :total="total" />
    </div>
    <div v-else class="pagination-placeholder"></div>
  </div>
</template>

<style scoped>
.predictions-table {
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
  gap: 16px;
}

.filters {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
}

.table {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
}

.pagination-placeholder {
  padding: 16px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
