<script setup lang="ts">
import { computed } from "vue";
import type { DashboardRiskCounts } from "@/modules/dashboard/types";
import type { RiskLevel } from "@/modules/predictions/types";
import { useRiskNavigation } from "@/modules/predictions/composables/useRiskNavigation";

const props = defineProps<{
  counts: DashboardRiskCounts;
}>();

const { openCritical } = useRiskNavigation();

const total = computed(() => props.counts.LOW + props.counts.MEDIUM + props.counts.HIGH);

type RiskRow = {
  key: RiskLevel;
  label: string;
  count: number;
  type: "danger" | "warning" | "success";
  clickable: boolean;
};

// Переход есть только у HIGH: журнал фильтрует по «не ниже порога», верхней границы
// в контракте нет — MEDIUM неотделим от HIGH, LOW — от всех остальных.
const items = computed<RiskRow[]>(() => [
  { key: "HIGH", label: "Высокий", count: props.counts.HIGH, type: "danger", clickable: true },
  { key: "MEDIUM", label: "Средний", count: props.counts.MEDIUM, type: "warning", clickable: false },
  { key: "LOW", label: "Низкий", count: props.counts.LOW, type: "success", clickable: false },
]);

function percent(count: number): number {
  if (total.value === 0) return 0;
  return Math.round((count / total.value) * 100);
}
</script>

<template>
  <div v-if="total > 0" class="risk-breakdown">
    <div
      v-for="item in items"
      :key="item.key"
      class="risk-breakdown__row"
      :class="{ 'risk-breakdown__row_clickable': item.clickable }"
      :role="item.clickable ? 'button' : undefined"
      :tabindex="item.clickable ? 0 : undefined"
      @click="item.clickable && openCritical()"
      @keydown.enter="item.clickable && openCritical()"
    >
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
      <span class="risk-breakdown__action">{{ item.clickable ? "Открыть →" : "" }}</span>
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
  grid-template-columns: 100px 1fr 60px 60px 90px;
  align-items: center;
  gap: 12px;
  border-radius: 6px;
}

.risk-breakdown__row_clickable {
  cursor: pointer;
  transition: background 0.2s;
}

.risk-breakdown__row_clickable:hover,
.risk-breakdown__row_clickable:focus-visible {
  background: var(--el-fill-color-light);
}

.risk-breakdown__action {
  font-size: 13px;
  color: var(--el-color-primary);
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
