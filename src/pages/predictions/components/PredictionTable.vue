<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { Prediction, RiskLevel } from "@/modules/predictions/types";

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

const riskType: Record<RiskLevel, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};
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
    <el-table-column label="Вероятность" min-width="120">
      <template #default="{ row }">
        {{ formatProbability(row.probability) }}
      </template>
    </el-table-column>
    <el-table-column label="Горизонт" min-width="160">
      <template #default="{ row }">
        {{ formatDateTime(row.horizonUntil) }}
      </template>
    </el-table-column>
    <el-table-column label="Цель" min-width="180">
      <template #default="{ row }"> {{ row.targetKind }} / {{ row.targetRef }} </template>
    </el-table-column>
    <el-table-column label="Риск" min-width="120">
      <template #default="{ row }">
        <el-tag :type="riskType[row.riskLevel as RiskLevel]">
          {{ row.riskLevel }}
        </el-tag>
      </template>
    </el-table-column>
    <el-table-column prop="status" label="Статус" min-width="120" />
    <el-table-column label="Время" min-width="160">
      <template #default="{ row }">
        {{ formatDateTime(row.computedAt) }}
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped></style>
