<script setup lang="ts">
import { markRaw, nextTick, ref, watch } from "vue";
import { Background } from "@vue-flow/background";
import { Controls } from "@vue-flow/controls";
import { useVueFlow, VueFlow, type Edge, type Node, type NodeMouseEvent } from "@vue-flow/core";
import { RENDER_ONLY_VISIBLE } from "@/modules/objects/consts";
import AuxGraphNode from "./AuxGraphNode.vue";
import ChannelGraphNode from "./ChannelGraphNode.vue";
import ObjectGraphNode from "./ObjectGraphNode.vue";

/**
 * Единственное место в приложении, где `<VueFlow>` в шаблоне.
 *
 * Граф read-only по смыслу: диспетчер не редактирует иерархию, поэтому drag, connection,
 * selection, delete и dblclick-зум выключены. остаётся панорамирование, колесо зума,
 * кнопки управления и клавиатурный фокус узлов (`nodes-focusable`) — экраном должны уметь
 * пользоваться без мыши.
 *
 * `nodeTypes` — через `markRaw`: без него Vue оборачивает компоненты в прокси и ругается на
 * мутацию, а Vue Flow хранит типы как есть.
 */
const props = defineProps<{
  nodes: Node[];
  edges: Edge[];
  /** id узла подсветки из `?highlightChannel=`; null — центрировать весь граф. */
  highlightedId: string | null;
  /** Смена фокуса (объект в селекте) — вид перестраивается заново. */
  focusId: string;
}>();

const emit = defineEmits<{ auxClick: [id: string] }>();

const nodeTypes = {
  object: markRaw(ObjectGraphNode),
  channel: markRaw(ChannelGraphNode),
  aux: markRaw(AuxGraphNode),
};

const { findNode, fitView, setCenter } = useVueFlow();

/** узлы отрисованы и измерены — до этого момента fitView/setCenter возвращают false */
const initialized = ref(false);

function centerOn(id: string) {
  const node = findNode(id);
  if (!node) return;
  const width = node.dimensions?.width ?? node.width ?? 0;
  const height = node.dimensions?.height ?? node.height ?? 0;
  setCenter(node.position.x + Number(width) / 2, node.position.y + Number(height) / 2, { zoom: 0.9, duration: 300 });
}

/**
 * Центровка строго после `nodes-initialized`: до этого события fitView/setCenter возвращают
 * false (измерений ещё нет), и первый кадр получался бы со сдвинутым видом.
 */
watch(
  [initialized, () => props.highlightedId, () => props.focusId, () => props.nodes.length],
  async ([isReady, highlighted]) => {
    if (!isReady) return;
    await nextTick();
    if (highlighted) centerOn(highlighted);
    else fitView({ padding: 0.18, duration: 300 });
  },
  { flush: "post" },
);

function onNodeClick(event: NodeMouseEvent) {
  if (event.node.type === "aux") emit("auxClick", event.node.id);
}
</script>

<template>
  <div class="graph-canvas">
    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :node-types="nodeTypes"
      :nodes-draggable="false"
      :edges-updatable="false"
      :connect-on-click="false"
      :elements-selectable="false"
      :delete-key-code="null"
      :selection-key-code="false"
      :zoom-on-double-click="false"
      :min-zoom="0.15"
      :max-zoom="1.6"
      :fit-view-on-init="true"
      :nodes-focusable="true"
      :only-render-visible-elements="RENDER_ONLY_VISIBLE"
      :default-edge-options="{ type: 'smoothstep', animated: false }"
      class="graph-canvas__flow"
      @node-click="onNodeClick"
      @nodes-initialized="initialized = true"
    >
      <Background :gap="24" :size="1" />
      <Controls :show-interactive="false" position="top-right" />
    </VueFlow>
  </div>
</template>

<style scoped>
.graph-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  background: var(--el-bg-color);
}

.graph-canvas__flow {
  width: 100%;
  height: 100%;
}
</style>
