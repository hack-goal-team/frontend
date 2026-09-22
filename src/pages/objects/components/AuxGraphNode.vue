<script setup lang="ts">
import { computed } from "vue";
import { Handle, Position, type NodeProps } from "@vue-flow/core";
import {
  AUX_CLICK_HINT,
  AUX_RETRY_HINT,
  CHANNELS_EMPTY,
  CHANNELS_ERROR,
  CHANNELS_LOADING,
  MORE_PREFIX,
} from "@/modules/objects/consts";
import type { AuxNodeData } from "@/modules/objects/lib/graph";

/**
 * Служебный узел в колонке детей: «+ ещё N», загрузка, ошибка, пусто.
 *
 * Он нужен, чтобы граф не исчезал, пока `/channels` грузится или упал: пустая колонка
 * читается как «каналов нет», а это ровно та ложь, из-за которой диспетчер примет
 * неверное решение. Узел состояния — утверждение про запрос, а не про объект.
 */
const props = defineProps<NodeProps<AuxNodeData>>();

const text = computed(() => {
  const data = props.data;
  if (data.aux === "more-channels") return `${MORE_PREFIX} ${data.count ?? 0} каналов`;
  if (data.aux === "more-children") return `${MORE_PREFIX} ${data.count ?? 0} объектов`;
  if (data.aux === "channels-loading") return CHANNELS_LOADING;
  if (data.aux === "channels-error") return CHANNELS_ERROR;
  return CHANNELS_EMPTY;
});

const clickable = computed(() => props.data.aux.startsWith("more-") || props.data.aux === "channels-error");
const hint = computed(() => (props.data.aux === "channels-error" ? AUX_RETRY_HINT : AUX_CLICK_HINT));
const variant = computed(() => (props.data.aux === "channels-error" ? "error" : "muted"));
</script>

<template>
  <el-tooltip :content="hint" placement="top" :disabled="!clickable">
    <div class="aux-node" :class="[`aux-node_${variant}`, { 'aux-node_clickable': clickable }]">
      <Handle type="target" :position="Position.Left" />
      <span class="aux-node__text">{{ text }}</span>
    </div>
  </el-tooltip>
</template>

<style scoped>
.aux-node {
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 12px;
  border-radius: var(--el-border-radius-base);
  border: 1px dashed var(--el-border-color);
  background: var(--el-fill-color-lighter);
  font-size: 12px;
}

.aux-node_error {
  border-color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.aux-node_error .aux-node__text {
  color: var(--el-color-danger);
}

.aux-node_clickable {
  cursor: pointer;
}

.aux-node_clickable:hover {
  border-style: solid;
  border-color: var(--el-color-primary);
}

.aux-node__text {
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
