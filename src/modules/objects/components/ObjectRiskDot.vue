<script setup lang="ts">
import { computed } from "vue";
import { RISK_LABEL } from "@/modules/predictions/consts";
import { NO_PREDICTIONS_LABEL, UNKNOWN_VALUE } from "../consts";
import type { NodeRisk } from "../types";

/**
 * Риск одной записи — серверный (`/objects?withRisk`, `/channels?withRisk`), здесь только
 * отрисовка. Звёздочки «выведено» больше нет: фронт ничего не выводит и не пересчитывает.
 *
 * Различия, которые нельзя терять:
 * - `level` → тег уровня;
 * - `risk` есть, `level: null` → ○ «без прогноза»: это утверждение сервиса;
 * - `risk === null` (поля риска в записи нет) → «—»: мы не знаем, и это не должно
 *   читаться как «спокойно».
 *
 * Тултип — редкий гость: только там, где есть что сказать сверх подписи на экране.
 * На каждой строке таблицы и на каждом узле графа он превращается в шум.
 */
const props = defineProps<{
  risk: NodeRisk | null;
}>();

const level = computed(() => props.risk?.level ?? null);
const label = computed(() => {
  if (level.value) return `${RISK_LABEL[level.value]} риск`;
  return props.risk ? NO_PREDICTIONS_LABEL : UNKNOWN_VALUE;
});
const variant = computed(() => {
  if (level.value) return level.value.toLowerCase();
  return props.risk ? "none" : "muted";
});
</script>

<template>
  <span class="object-risk">
    <span class="object-risk__dot" :class="`object-risk__dot_${variant}`" />
    <span class="object-risk__text">{{ label }}</span>
  </span>
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
</style>
