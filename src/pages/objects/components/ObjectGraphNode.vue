<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, type NodeProps } from "@vue-flow/core";
import { InfoFilled, WarningFilled } from "@element-plus/icons-vue";
import { ORPHAN_TAG, RISK_DERIVED_NOTE } from "@/modules/objects/consts";
import { objectIdNote, objectLabel, objectSublabel } from "@/modules/objects/lib/label";
import type { ObjectNodeData } from "@/modules/objects/lib/graph";
import ObjectLevelTag from "@/modules/objects/components/ObjectLevelTag.vue";
import ObjectRiskDot from "@/modules/objects/components/ObjectRiskDot.vue";

/**
 * Узел объекта. Подпись и риск — те же компоненты, что в таблице реестра: на графе
 * диспетчер не должен встречать другой язык разметки.
 *
 * Уровень риска окрашивает карточку целиком (рамка + фон), левая полоса — тот же цвет,
 * но плотнее: на сильном риске карточка обязана читаться издалека, когда текста уже не разобрать.
 * Цвет не заменяет текстовую подпись: он нерабочий ни для дальтоников, ни на печати.
 */
const props = defineProps<NodeProps<ObjectNodeData>>();

const riskClass = computed(() => `object-node_risk-${props.data.risk?.level?.toLowerCase() ?? "unknown"}`);
const derived = computed(() => props.data.risk?.source === "derived" && !!props.data.risk?.level);
</script>

<template>
  <div class="object-node" :class="[riskClass, { 'object-node_focus': data.focused }]">
    <Handle type="target" :position="Position.Top" />

    <div class="object-node__head">
      <el-tooltip :content="objectIdNote(data.object)" placement="top">
        <span class="object-node__name">{{ objectLabel(data.object) }}</span>
      </el-tooltip>
      <el-tooltip v-if="data.detached" :content="ORPHAN_TAG" placement="top">
        <el-icon class="object-node__mark object-node__mark_warning"><WarningFilled /></el-icon>
      </el-tooltip>
      <el-tooltip v-else-if="derived" :content="RISK_DERIVED_NOTE" placement="top">
        <el-icon class="object-node__mark"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>

    <div class="object-node__meta">
      <span class="object-node__sub">{{ objectSublabel(data.object) }}</span>
      <ObjectLevelTag :level="data.object.hierarchyLevel" />
    </div>

    <ObjectRiskDot :risk="data.risk" class="object-node__risk" />

    <Handle type="source" :position="Position.Bottom" />
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
}

.object-node_risk-high {
  border-color: var(--el-color-danger-light-7);
  border-left-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.object-node_risk-medium {
  border-color: var(--el-color-warning-light-7);
  border-left-color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.object-node_risk-low {
  border-color: var(--el-color-success-light-7);
  border-left-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.object-node_risk-unknown {
  border-left-color: var(--el-border-color-darker);
}

/* После цветов риска: рамка фокуса перечёркивает цветную рамку, а тон карточки остаётся. */
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
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.object-node__mark {
  flex-shrink: 0;
  color: var(--el-text-color-secondary);
}

.object-node__mark_warning {
  color: var(--el-color-warning);
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
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.object-node__risk {
  font-size: 12px;
}
</style>
