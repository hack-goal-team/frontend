<script setup lang="ts">
import { RISK_LABEL } from "@/modules/predictions/consts";
import { EQUIPMENT_CHECK_LABEL, NO_PREDICTIONS_LABEL, RELATIONS_HINT, UNKNOWN_VALUE } from "@/modules/objects/consts";
import IncidentClassIcon from "@/modules/predictions/components/IncidentClassIcon.vue";

/**
 * Легенда рисков и постоянная подпись про природу связей.
 *
 * RELATIONS_HINT показан текстом, а не спрятан в иконку: «схема коллектора» и «иерархия
 * объекта» читаются одинаково, если не сказать разницу вслух. Это единственное место с этим
 * текстом — и расшифровка значков: узлов на экране десятки, tooltip на каждом читается как
 * шум, поэтому значки объясняются здесь, а метка осиротевшей записи — сама в себе.
 *
 * Расшифровка ○ и «—» общая для объектов и каналов: риск серверный (`withRisk=true`),
 * ○ — утверждение бэка «активных прогнозов нет», «—» — поле `risk` в запись не пришло.
 */
const marks = [
  { level: "HIGH", color: "var(--el-color-danger)", label: `${RISK_LABEL.HIGH} риск` },
  { level: "MEDIUM", color: "var(--el-color-warning)", label: `${RISK_LABEL.MEDIUM} риск` },
  { level: "LOW", color: "var(--el-color-success)", label: `${RISK_LABEL.LOW} риск` },
];
</script>

<template>
  <div class="graph-legend">
    <div class="graph-legend__row">
      <span v-for="mark in marks" :key="mark.level" class="graph-legend__item">
        <span class="graph-legend__dot" :style="{ background: mark.color }" />
        <span class="graph-legend__label">{{ mark.label }}</span>
      </span>

      <span class="graph-legend__item">
        <span class="graph-legend__dot graph-legend__dot_none" />
        <span class="graph-legend__label">{{ NO_PREDICTIONS_LABEL }}</span>
      </span>

      <span class="graph-legend__item">
        <span class="graph-legend__dot graph-legend__dot_unknown" />
        <span class="graph-legend__label">{{ UNKNOWN_VALUE }} нет данных</span>
      </span>

      <span class="graph-legend__item">
        <span class="graph-legend__check"><IncidentClassIcon code="EQUIPMENT_FAILURE" /></span>
        <span class="graph-legend__label">{{ EQUIPMENT_CHECK_LABEL }}</span>
      </span>
    </div>

    <p class="graph-legend__hint">{{ RELATIONS_HINT }}</p>
  </div>
</template>

<style scoped>
.graph-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  font-size: 12px;
}

.graph-legend__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.graph-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.graph-legend__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.graph-legend__check {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--el-border-color-darker);
}

.graph-legend__dot_none {
  background: transparent;
  border: 1px solid var(--el-border-color-darker);
}

.graph-legend__dot_unknown {
  background: transparent;
  border: 1px dashed var(--el-border-color);
}

.graph-legend__label {
  color: var(--el-text-color-regular);
}

.graph-legend__hint {
  margin: 0;
  max-width: 960px;
  color: var(--el-text-color-secondary);
}
</style>
