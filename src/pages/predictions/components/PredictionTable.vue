<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { Prediction } from "@/modules/predictions/types";
import RiskTag from "./RiskTag.vue";
import SensorStateTag from "./SensorStateTag.vue";
import StatusTag from "./StatusTag.vue";

defineProps<{
  items: Prediction[];
  loading?: boolean;
}>();

const emit = defineEmits<{
  rowClick: [id: string];
}>();

function handleRowClick(row: Prediction) {
  emit("rowClick", row.id);
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="items"
    stripe
    height="100%"
    style="width: 100%"
    :border="true"
    empty-text="Загрузка..."
    highlight-current-row
    show-overflow-tooltip
    @row-click="handleRowClick"
  >
    <el-table-column label="Вероятность" min-width="120">
      <template #default="{ row }">
        {{ formatProbability(row.probability) }}
      </template>
    </el-table-column>
    <el-table-column label="Горизонт" min-width="150">
      <template #default="{ row }">
        {{ formatDateTime(row.horizonUntil) }}
      </template>
    </el-table-column>
    <el-table-column label="Объект" width="200">
      <template #default="{ row }">
        <span v-if="row.context?.objectName">
          {{ row.context.objectName }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
    </el-table-column>
    <el-table-column label="Датчик" width="230">
      <template #default="{ row }">
        <span v-if="row.context.sensorName">
          {{ row.context.sensorName }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
    </el-table-column>
    <el-table-column label="Риск" min-width="90">
      <template #default="{ row }">
        <RiskTag :level="row.riskLevel" />
      </template>
    </el-table-column>
    <el-table-column label="Состояние" min-width="130">
      <template #default="{ row }">
        <SensorStateTag :state="row.currentState" />
      </template>
    </el-table-column>
    <el-table-column prop="status" label="Статус" min-width="260">
      <template #default="{ row }">
        <StatusTag :status="row.status" />
      </template>
    </el-table-column>
    <el-table-column label="Время" min-width="150">
      <template #default="{ row }">
        {{ formatDateTime(row.computedAt) }}
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
