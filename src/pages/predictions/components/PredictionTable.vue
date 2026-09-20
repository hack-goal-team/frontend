<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { Prediction } from "@/modules/predictions/types";
import RiskTag from "./RiskTag.vue";
import { useLabels } from "@/modules/reference/composables/useLabels.ts";
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

const { reasonLabel } = useLabels();
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
    @row-click="handleRowClick"
  >
    <el-table-column prop="incidentType" label="Тип" min-width="140" />
    <el-table-column label="Вероятность" min-width="65">
      <template #default="{ row }">
        {{ formatProbability(row.probability) }}
      </template>
    </el-table-column>
    <el-table-column label="Горизонт" min-width="160">
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

    <el-table-column label="Цель" width="180">
      <template #default="{ row }">
        <span class="text-muted"> {{ row.targetKind }} / {{ row.targetRef }} </span>
      </template>
    </el-table-column>
    <el-table-column label="Датчик" width="180">
      <template #default="{ row }">
        <span v-if="row.context.sensorName">
          {{ row.context.sensorName }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
    </el-table-column>
    <el-table-column label="Риск" min-width="120">
      <template #default="{ row }">
        <RiskTag :level="row.riskLevel" />
      </template>
    </el-table-column>
    <el-table-column label="Решение" width="220">
      <template #default="{ row }">
        <el-tag v-if="row.lastDecision" type="success" size="small">
          {{ reasonLabel(row.lastDecision.reasonCode) }}
        </el-tag>
        <el-tag v-else type="info" size="small">Нет</el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="status" label="Статус" min-width="120">
      <template #default="{ row }">
        <StatusTag :status="row.status" />
      </template>
    </el-table-column>
    <el-table-column label="Время" min-width="160">
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
