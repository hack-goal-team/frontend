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
 * Риск окрашивает карточку целиком, как и у объекта. Карточка с прогнозом кликабельна:
 * клик открывает панель деталей прогноза этого канала — поэтому «кликабельности» нет у
 * карточки без прогноза, и мёртвого клика мы не показываем.
 */
const props = defineProps<NodeProps<ChannelNodeData>>();

const label = computed(() => props.data.channel.name?.trim() || `Канал #${props.data.channel.id}`);
const riskClass = computed(() => `channel-node_risk-${props.data.risk?.level?.toLowerCase() ?? "unknown"}`);
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
}

.channel-node_unknown {
  border-style: dashed;
}

.channel-node_risk-high {
  border-color: var(--el-color-danger-light-7);
  border-left-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.channel-node_risk-medium {
  border-color: var(--el-color-warning-light-7);
  border-left-color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
}

.channel-node_risk-low {
  border-color: var(--el-color-success-light-7);
  border-left-color: var(--el-color-success);
  background: var(--el-color-success-light-9);
}

.channel-node_risk-unknown {
  border-left-color: var(--el-border-color-darker);
}

/* После цветов риска: подсветка меняет только рамку. Тон карточки — про риск, а не про поиск. */
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
  color: var(--el-text-color-primary);
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
  color: var(--el-text-color-secondary);
}

.channel-node__type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
