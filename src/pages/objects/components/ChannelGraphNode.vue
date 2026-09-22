<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, type NodeProps } from "@vue-flow/core";
import { CHANNEL_OPEN_PREDICTION_HINT, CHANNEL_UNKNOWN_BADGE } from "@/modules/objects/consts";
import ObjectRiskDot from "@/modules/objects/components/ObjectRiskDot.vue";
import type { ChannelNodeData } from "@/modules/objects/lib/graph";

/**
 * Узел канала. Порядок узлов = порядок выдачи `/channels`, и это НЕ утверждение о трассе:
 * подпись держит позицию в перечне, а не «следующий участок».
 *
 * `known: false` (ADR-014) — канал есть в потоке измерений, но его нет в реестре. Такой узел
 * показываем пунктиром и с бейджем: потерять его значит показать диспетчеру меньше каналов,
 * чем их на самом деле.
 *
 * Риск заливает карточку целиком, как и у объекта: фон = цвет полосы слева, текст белый.
 * Карточка с прогнозом кликабельна: клик открывает панель деталей прогноза этого канала —
 * поэтому «кликабельности» нет у карточки без прогноза, и мёртвого клика мы не показываем.
 */
const props = defineProps<NodeProps<ChannelNodeData>>();

const label = computed(() => props.data.channel.name?.trim() || `Канал #${props.data.channel.id}`);
const riskClass = computed(() => `channel-node_risk-${props.data.risk?.level?.toLowerCase() ?? "unknown"}`);
/** Заливка только у карточки с уровнем: «нет данных» и «прогнозов нет» остаются светлыми. */
const filled = computed(() => !!props.data.risk?.level);
const clickable = computed(() => !!props.data.predictionId);
</script>

<template>
  <el-tooltip :content="CHANNEL_OPEN_PREDICTION_HINT" placement="top" :disabled="!clickable">
    <div
      class="channel-node"
      :class="[
        riskClass,
        {
          'channel-node_unknown': !data.channel.known,
          'channel-node_filled': filled,
          'channel-node_highlighted': data.highlighted,
          'channel-node_clickable': clickable,
        },
      ]"
    >
      <Handle type="target" :position="Position.Left" />

      <div class="channel-node__head">
        <el-tooltip :content="`ID: ${data.channel.id}`" placement="top">
          <span class="channel-node__name">{{ label }}</span>
        </el-tooltip>
        <el-tag v-if="!data.channel.known" type="info" size="small" effect="plain">
          {{ CHANNEL_UNKNOWN_BADGE }}
        </el-tag>
      </div>

      <div class="channel-node__meta">
        <span class="channel-node__type">{{ data.channel.sensorType }} · {{ data.channel.engineeringSystem }}</span>
        <ObjectRiskDot :risk="data.risk" />
      </div>
    </div>
  </el-tooltip>
</template>

<style scoped>
.channel-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 6px 10px 6px 12px;
  border-radius: var(--el-border-radius-base);
  border: 1px solid var(--el-border-color);
  border-left-width: 4px;
  background: var(--el-bg-color-overlay);
  font-size: 12px;
  /* Текст узла: на светлой карточке — обычные цвета темы, на залитой цветом риска — белый. */
  --node-text: var(--el-text-color-primary);
  --node-muted: var(--el-text-color-secondary);
}

.channel-node_unknown {
  border-style: dashed;
}

.channel-node_risk-high {
  --node-fill: var(--el-color-danger);
  --node-edge: var(--el-color-danger-light-7);
}

.channel-node_risk-medium {
  --node-fill: var(--el-color-warning);
  --node-edge: var(--el-color-warning-light-7);
}

.channel-node_risk-low {
  --node-fill: var(--el-color-success);
  --node-edge: var(--el-color-success-light-7);
}

/*
 * Карточка залита цветом полосы слева. Рамку оставляем светлее: каналов много и стоят они
 * вплотную — без более светлого контура колонка превратилась бы в одно цветное пятно.
 */
.channel-node_filled {
  border-color: var(--node-edge);
  border-left-color: var(--node-fill);
  background: var(--node-fill);
  --node-text: var(--el-color-white);
  --node-muted: rgba(255, 255, 255, 0.85);
}

.channel-node_risk-unknown {
  border-left-color: var(--el-border-color-darker);
}

/* После заливки: подсветка меняет только рамку. Цвет карточки — про риск, а не про поиск. */
.channel-node_highlighted {
  border-color: var(--el-color-primary);
  border-left-color: var(--el-color-primary);
}

/* Прогноза у канала нет — курсор не обещает переход, которого не будет. */
.channel-node_clickable {
  cursor: pointer;
}

.channel-node__head {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.channel-node__name {
  color: var(--node-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.channel-node__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  color: var(--node-muted);
}

.channel-node__type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/*
 * ObjectRiskDot — отдельный компонент со своими scoped-цветами, отсюда они не переопределяются.
 * Точку обводим белым: цвет риска на фоне цвета риска — это невидимка.
 */
.channel-node_filled :deep(.object-risk__text) {
  color: var(--node-text);
}

.channel-node_filled :deep(.object-risk__mark) {
  color: var(--node-muted);
}

.channel-node_filled :deep(.object-risk__dot) {
  box-shadow: 0 0 0 1px var(--el-color-white);
}
</style>
