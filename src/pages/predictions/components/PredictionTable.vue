<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { Prediction, RiskLevel } from "@/modules/predictions/types";

defineProps<{
  items: Prediction[];
  loading?: boolean;
}>();

const riskType: Record<RiskLevel, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};
</script>

<template>
  <div class="table">
    <el-table :data="items" v-loading="loading" stripe :border="true" height="100%">
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
  </div>
</template>

<style scoped>
.table {
  min-height: 0;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
}
</style>
