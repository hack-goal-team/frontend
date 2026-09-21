<script setup lang="ts">
import { computed } from "vue";
import type { DashboardRiskCounts } from "@/modules/dashboard/types";

const props = defineProps<{
  counts: DashboardRiskCounts;
}>();

const total = computed(() => props.counts.LOW + props.counts.MEDIUM + props.counts.HIGH);

const items = computed(() => [
  { key: "HIGH", label: "Высокий", count: props.counts.HIGH, type: "danger" as const },
  { key: "MEDIUM", label: "Средний", count: props.counts.MEDIUM, type: "warning" as const },
  { key: "LOW", label: "Низкий", count: props.counts.LOW, type: "success" as const },
]);

function percent(count: number): number {
  if (total.value === 0) return 0;
  return Math.round((count / total.value) * 100);
}
</script>

<template>
  <div v-if="total > 0" class="risk-breakdown">
    <div v-for="item in items" :key="item.key" class="risk-breakdown__row">
      <el-tag :type="item.type" size="small" class="risk-breakdown__label">
        {{ item.label }}
      </el-tag>
      <el-progress
        :percentage="percent(item.count)"
        :show-text="false"
        :stroke-width="20"
        :color="
          item.key === 'HIGH'
            ? 'var(--el-color-danger)'
            : item.key === 'MEDIUM'
              ? 'var(--el-color-warning)'
              : 'var(--el-color-success)'
        "
        class="risk-breakdown__bar"
      />
      <span class="risk-breakdown__count">{{ item.count }}</span>
      <span class="risk-breakdown__percent">{{ percent(item.count) }}%</span>
    </div>
  </div>
  <el-empty v-else description="Нет активных прогнозов" />
</template>

<style scoped>
.risk-breakdown {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.risk-breakdown__row {
  display: grid;
  grid-template-columns: 100px 1fr 60px 60px;
  align-items: center;
  gap: 12px;
}

.risk-breakdown__label {
  justify-self: start;
}

.risk-breakdown__count {
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.risk-breakdown__percent {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
</style>
