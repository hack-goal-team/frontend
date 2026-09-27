<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, type NodeProps } from "@vue-flow/core";
import { WarningFilled } from "@element-plus/icons-vue";
import { ORPHAN_SHORT } from "@/modules/objects/consts";
import { objectLabel, objectSublabel } from "@/modules/objects/lib/label";
import type { ObjectNodeData } from "@/modules/objects/lib/graph";
import ObjectLevelTag from "@/modules/objects/components/ObjectLevelTag.vue";
import ObjectRiskDot from "@/modules/objects/components/ObjectRiskDot.vue";

/**
 * Узел объекта. Подпись и риск — те же компоненты, что в таблице реестра: на графе
 * диспетчер не должен встречать другой язык разметки.
 *
 * Тултипов на узле нет намеренно: узлов на экране десятки, и наведение на каждый — шум.
 * Единственное исключение живёт в `ObjectRiskDot` и срабатывает редко — на «без прогноза»,
 * где без горизонта модели подпись остаётся необъяснённой.
 * Осиротевшая запись помечается знаком с текстом, происхождение уровня читается из подписи
 * `ObjectRiskDot`, а расшифровывается всё это в легенде под графом.
 *
 * Карточка залита тем же цветом, что и полоса слева: риск обязан читаться издалека, когда
 * текста уже не разобрать. Отсюда белый текст внутри — `--el-text-color-*` на dense-заливке
 * не читаются ни в светлой, ни в тёмной теме. Цвет не заменяет текстовую подпись: он
 * нерабочий ни для дальтоников, ни на печати.
 */
const props = defineProps<NodeProps<ObjectNodeData>>();

const riskClass = computed(() => `object-node_risk-${props.data.risk?.level?.toLowerCase() ?? "unknown"}`);
/** Заливка только у карточки с уровнем: «нет данных» и «прогнозов нет» остаются светлыми. */
const filled = computed(() => !!props.data.risk?.level);
</script>

<template>
  <div class="object-node" :class="[riskClass, { 'object-node_focus': data.focused, 'object-node_filled': filled }]">
    <Handle type="target" :position="Position.Left" />

    <div class="object-node__head">
      <span class="object-node__name">{{ objectLabel(data.object) }}</span>
      <span v-if="data.detached" class="object-node__orphan">
        <el-icon class="object-node__orphan-icon"><WarningFilled /></el-icon>
        {{ ORPHAN_SHORT }}
      </span>
    </div>

    <div class="object-node__meta">
      <span class="object-node__sub">{{ objectSublabel(data.object) }}</span>
      <ObjectLevelTag :level="data.object.hierarchyLevel" />
    </div>

    <ObjectRiskDot :risk="data.risk" />

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.object-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  padding: 8px 12px 8px 14px;
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  border-left-width: 4px;
  background: var(--el-bg-color-overlay);
  /* Текст узла: на светлой карточке — обычные цвета темы, на залитой цветом риска — белый. */
  --node-text: var(--el-text-color-primary);
  --node-muted: var(--el-text-color-secondary);
}

.object-node_risk-high {
  --node-fill: var(--el-color-danger);
  --node-edge: var(--el-color-danger-light-7);
}

.object-node_risk-medium {
  --node-fill: var(--el-color-warning);
  --node-edge: var(--el-color-warning-light-7);
}

.object-node_risk-low {
  --node-fill: var(--el-color-success);
  --node-edge: var(--el-color-success-light-7);
}

/*
 * Карточка залита цветом полосы слева. Рамку оставляем светлее: узлы одного уровня стоят
 * вплотную, и без более светлого контура колонка объектов слиплась бы в одно пятно.
 */
.object-node_filled {
  border-color: var(--node-edge);
  border-left-color: var(--node-fill);
  background: var(--node-fill);
  --node-text: var(--el-color-white);
  --node-muted: rgba(255, 255, 255, 0.85);
}

.object-node_risk-unknown {
  border-left-color: var(--el-border-color-darker);
}

/* После цветов риска: рамка фокуса перечёркивает цветную рамку, а заливка карточки остаётся. */
.object-node_focus {
  border-color: var(--el-color-primary);
  border-left-color: var(--el-color-primary);
  box-shadow: var(--el-box-shadow-light);
}

.object-node__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.object-node__name {
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--node-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*
 * Осиротевшая запись — знак с текстом, а не tooltip: «навести, чтобы понять, что с узлом
 * что-то не так» диспетчером не читается, а узла на экране не один.
 */
.object-node__orphan {
  box-sizing: border-box;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 0 5px;
  border: 1px solid currentColor;
  border-radius: var(--el-border-radius-base);
  font-size: 11px;
  line-height: 16px;
  white-space: nowrap;
  color: var(--el-color-warning);
}

/* Оранжевый warning на красной и на оранжевой заливке не видно — форма иконки остаётся. */
.object-node_filled .object-node__orphan {
  color: var(--node-text);
}

.object-node__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}

.object-node__sub {
  font-size: 11px;
  color: var(--node-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*
 * ObjectRiskDot — отдельный компонент со своими scoped-цветами, отсюда они не переопределяются.
 * Точку обводим белым: цвет риска на фоне цвета риска — это невидимка.
 */
.object-node_filled :deep(.object-risk__text) {
  color: var(--node-text);
}

.object-node_filled :deep(.object-risk__dot) {
  box-shadow: 0 0 0 1px var(--el-color-white);
}
</style>
