<script setup lang="ts">
import { usePredictions } from "@/modules/predictions/composables/usePredictions";
import PredictionTable from "./components/PredictionTable.vue";

const { data, isLoading, isError, error } = usePredictions();
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title"><h2>Прогнозы</h2></span>
  </Teleport>

  <div class="predictions-page">
    <el-alert
      v-if="isError"
      type="error"
      :title="`Ошибка загрузки: ${(error as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <el-empty v-else-if="!isLoading && (!data?.items || data.items.length === 0)" description="Прогнозов нет" />

    <PredictionTable v-else :items="data?.items ?? []" :loading="isLoading" />
  </div>
</template>

<style scoped>
.predictions-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
</style>
