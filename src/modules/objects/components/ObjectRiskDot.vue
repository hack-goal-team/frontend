<script setup lang="ts">
import { computed } from "vue";
import { RISK_LABEL } from "@/modules/predictions/consts";
import {
  NO_PREDICTIONS_LABEL,
  RISK_DERIVED_NOTE,
  RISK_SCAN_PARTIAL_ALERT,
  RISK_UNATTRIBUTED_NOTE,
  UNKNOWN_VALUE,
} from "../consts";
import { isRiskCertain } from "../lib/risk";
import type { NodeRisk } from "../types";

/**
 * Риск одной записи — уже разрешённый `resolveRisk`, здесь только отрисовка.
 * Риск всегда производный (контракт v0 поле `risk` не отдаёт), отсюда звёздочка у уровня.
 *
 * Различия, которые нельзя терять:
 * - `level` → тег уровня со звёздочкой, расшифровка — в подписи/легенде;
 * - `level: null` при определённом скане → ○ «без прогноза»: это утверждение;
 * - `coverage: "partial"` без уровня → НЕЙТРАЛЬНО, никогда не ○: мы не досмотрели;
 * - прогноз есть, но не сворачивается сюда (`hasUnattributed`) → тоже НЕЙТРАЛЬНО: ○ было бы
 *   ложной уверенностью;
 * - `risk === null` → «—» без тултипа: повторять «нет данных» на каждой строке — шум,
 *   а причину (упавший скан) объясняет el-alert над таблицей.
 *
 * Тултип — редкий гость: только там, где есть что сказать сверх подписи на экране.
 * На каждой строке таблицы и на каждом узле графа он превращается в шум.
 */
const props = defineProps<{
  risk: NodeRisk | null;
}>();

const level = computed(() => props.risk?.level ?? null);
/** ○ «без прогноза» допустимо только когда скан завершён и прогнозов без цели не осталось. */
const certain = computed(() => isRiskCertain(props.risk));
const label = computed(() => {
  if (level.value) return `${RISK_LABEL[level.value]} риск`;
  return certain.value ? NO_PREDICTIONS_LABEL : UNKNOWN_VALUE;
});
const variant = computed(() => {
  if (level.value) return level.value.toLowerCase();
  return certain.value ? "none" : "muted";
});

const hint = computed<string | null>(() => {
  const risk = props.risk;
  if (!risk) return null;
  if (risk.coverage === "partial") return RISK_SCAN_PARTIAL_ALERT;
  if (!level.value && !certain.value) return RISK_UNATTRIBUTED_NOTE;
  return RISK_DERIVED_NOTE;
});
</script>

<template>
  <el-tooltip :content="hint ?? ''" placement="top" :disabled="!hint">
    <span class="object-risk">
      <span class="object-risk__dot" :class="`object-risk__dot_${variant}`" />
      <span class="object-risk__text">{{ label }}</span>
      <span v-if="level" class="object-risk__mark">*</span>
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
