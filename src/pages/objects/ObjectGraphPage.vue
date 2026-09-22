<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/store";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import { MAX_CHILD_OBJECT_NODES, OBJECT_NOT_FOUND } from "@/modules/objects/consts";
import { GRAPH_ID, buildObjectGraph, toFlowEdges, toFlowNodes } from "@/modules/objects/lib/graph";
import { useObjectRegistry } from "@/modules/objects/composables/useObjectRegistry";
import ObjectGraphCanvas from "./components/ObjectGraphCanvas.vue";
import ObjectGraphHeading from "./components/ObjectGraphHeading.vue";
import ObjectGraphLegend from "./components/ObjectGraphLegend.vue";
import GraphSkeleton from "./components/skeletons/GraphSkeleton.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const registry = useObjectRegistry();

/** `route.params.id` типизирован string | string[] — нормализуем, иначе id уедет в [object Object]. */
const objectId = computed(() => String(route.params.id ?? ""));

/**
 * Разворот «+ ещё» для детей-объектов. Это не фильтр и не выбор объекта — они в URL, —
 * а способ показать уже принятые узлы; на ссылку и на выдачу влияния нет.
 */
const childrenExpanded = ref(false);

const focus = computed(() => registry.nodeById(objectId.value));

const ancestors = computed(() => (focus.value ? registry.ancestorsOf(focus.value.id) : []));

const graph = computed(() => {
  const node = focus.value;
  if (!node) return null;

  return buildObjectGraph({
    focus: node,
    ancestors: ancestors.value,
    // Каналы подключаются следующим инкрементом: "off" — колонки состояния нет, узлы не врут.
    channels: [],
    channelState: "off",
    channelTotal: null,
    riskOfNode: registry.riskOf,
    highlightChannel: null,
    childLimit: childrenExpanded.value ? Number.MAX_SAFE_INTEGER : MAX_CHILD_OBJECT_NODES,
  });
});

const flowNodes = computed(() => (graph.value ? toFlowNodes(graph.value) : []));
const flowEdges = computed(() => (graph.value ? toFlowEdges(graph.value) : []));

/** Легенда обязана говорить, откуда взялся уровень: реестр или свёртка по активным прогнозам. */
const derivedRisk = computed(
  () => registry.riskSupport.value !== "supported" && registry.riskCoverage.value !== "none",
);

const isEmptyScope = computed(() => auth.isEmptyScope);
const isReady = computed(() => !registry.isLoading.value && !registry.isError.value);
const notFound = computed(() => isReady.value && !focus.value);

function selectObject(id: string) {
  // Query перезаписываем целиком: подсветка чужого канала на новом объекте бессмысленна.
  router.replace({ name: "object-graph", params: { id }, query: {} });
}

function onAuxClick(id: string) {
  if (id === GRAPH_ID.moreChildren) childrenExpanded.value = true;
}
</script>

<template>
  <ObjectGraphHeading
    :objects="registry.items.value"
    :current-id="objectId"
    :detached="focus?.detached ?? false"
    :disabled="!isReady"
    @select="selectObject"
  />

  <div class="object-graph">
    <EmptyScopeNotice v-if="isEmptyScope" />

    <el-alert
      v-else-if="registry.isError.value"
      type="error"
      :title="`Ошибка загрузки: ${(registry.error.value as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <GraphSkeleton v-else-if="registry.isLoading.value" />

    <el-empty v-else-if="notFound" :description="OBJECT_NOT_FOUND" />

    <template v-else>
      <ObjectGraphCanvas
        :nodes="flowNodes"
        :edges="flowEdges"
        :focus-id="graph?.focusId ?? ''"
        :highlighted-id="graph?.highlightedId ?? null"
        @aux-click="onAuxClick"
      />

      <ObjectGraphLegend
        :derived="derivedRisk"
        :coverage="registry.riskCoverage.value"
        :unattributed="registry.riskUnattributed.value"
      />
    </template>
  </div>
</template>

<style scoped>
.object-graph {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
