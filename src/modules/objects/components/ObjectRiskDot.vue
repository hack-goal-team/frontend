<script setup lang="ts">
import { computed } from "vue";
import { RISK_LABEL } from "@/modules/predictions/consts";
import {
  NO_DATA_NOTE,
  NO_PREDICTIONS_LABEL,
  RISK_DERIVED_NOTE,
  RISK_SCAN_PARTIAL_ALERT,
  UNKNOWN_VALUE,
} from "../consts";
import type { NodeRisk } from "../types";

/**
 * Риск одной записи — уже разрешённый `resolveRisk`, здесь только отрисовка.
 *
 * Различия, которые нельзя терять:
 * - `source: "registry"` с `level` → тег уровня без сноски;
 * - `source: "registry"` с `level: null` → ○ «без прогноза»: это утверждение бэка;
 * - `source: "derived"` → тот же цвет, но подпись «выведено из активных прогнозов»
 *   (снимается с колонки, а в tooltip — число прогнозов);
 * - `coverage: "partial"` без уровня → НЕЙТРАЛЬНО, никогда не ○: мы не досмотрели;
 * - `risk === null` → «—» и «нет данных».
 */
const props = defineProps<{
  risk: NodeRisk | null;
}>();

const level = computed(() => props.risk?.level ?? null);
/** ○ «без прогноза» допустимо только когда источник утвердителен: реестр либо завершённый скан. */
const certain = computed(() => props.risk?.source === "registry" || props.risk?.coverage === "complete");
const label = computed(() => {
  if (level.value) return `${RISK_LABEL[level.value]} риск`;
  return props.risk && certain.value ? NO_PREDICTIONS_LABEL : UNKNOWN_VALUE;
});
const variant = computed(() => {
  if (level.value) return level.value.toLowerCase();
  return props.risk && certain.value ? "none" : "muted";
});

const hint = computed(() => {
  const risk = props.risk;
  if (!risk) return NO_DATA_NOTE;

  const notes: string[] = [risk.source === "registry" ? "сводка реестра" : RISK_DERIVED_NOTE];
  if (risk.coverage === "partial") notes.push(RISK_SCAN_PARTIAL_ALERT);
  notes.push(
    risk.level === null && certain.value
      ? "активных прогнозов нет"
      : `активных: ${risk.activeCount}, без решения: ${risk.unreviewedCount}`,
  );

  return notes.join(" · ");
});
</script>

<template>
  <el-tooltip :content="hint" placement="top">
    <span class="object-risk" :class="{ 'object-risk_derived': risk?.source === 'derived' && level }">
      <span class="object-risk__dot" :class="`object-risk__dot_${variant}`" />
      <span class="object-risk__text">{{ label }}</span>
      <span v-if="risk?.source === 'derived' && level" class="object-risk__mark">*</span>
    </span>
  </el-tooltip>
</template>

<style scoped>
.object-risk {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.object-risk__dot {
  width: 10px;
  height: 10px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--el-text-color-placeholder);
}

.object-risk__dot_high {
  background: var(--el-color-danger);
}

.object-risk__dot_medium {
  background: var(--el-color-warning);
}

.object-risk__dot_low {
  background: var(--el-color-success);
}

/* ○ — «прогнозов нет», это утверждение, а не неизвестность */
.object-risk__dot_none {
  background: transparent;
  border: 1px solid var(--el-border-color-darker);
}

.object-risk__dot_muted {
  background: transparent;
  border: 1px dashed var(--el-border-color);
}

.object-risk__text {
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.object-risk__mark {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}
</style>
