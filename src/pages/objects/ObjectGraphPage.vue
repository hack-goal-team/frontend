<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/store";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import {
  useObjectChannelsQuery,
  type HighlightScanOutcome,
} from "@/modules/channels/composables/useObjectChannelsQuery";
import {
  CHANNEL_NODE_LIMIT,
  CHANNEL_SEARCH_PREFIX,
  HIGHLIGHT_SCAN_MAX_PAGES,
  MAX_CHILD_OBJECT_NODES,
  OBJECT_NOT_FOUND,
  channelNotFoundText,
  channelScanTruncatedText,
} from "@/modules/objects/consts";
import {
  GRAPH_ID,
  buildObjectGraph,
  toFlowEdges,
  toFlowNodes,
  type ChannelColumnState,
} from "@/modules/objects/lib/graph";
import { useObjectRegistry } from "@/modules/objects/composables/useObjectRegistry";
import ChannelStripMap from "./components/ChannelStripMap.vue";
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
 * Подсветка канала живёт в URL (§ 8 плана): перезагрузка обязана воспроизвести тот же вид,
 * поэтому параметр из адресной строки не вычищается даже когда канал не найден.
 */
const highlightChannel = computed<string | null>(() => {
  const raw = route.query.highlightChannel;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value !== "" ? value : null;
});

/**
 * Разворот «+ ещё» для детей-объектов. Это не фильтр и не выбор объекта — они в URL, —
 * а способ показать уже принятые узлы; на ссылку и на выдачу влияния нет.
 */
const childrenExpanded = ref(false);

/**
 * Потолок каналов на графе. Поднимается кликом по «+ ещё» и по сегменту полосы: страницы
 * при этом догружаются запросом, но узлы не ждут ответа.
 */
const channelLimit = ref(CHANNEL_NODE_LIMIT);

const focus = computed(() => registry.nodeById(objectId.value));

const ancestors = computed(() => (focus.value ? registry.ancestorsOf(focus.value.id) : []));

/** У уровня 2 каналов по контракту нет; неизвестный id экран не рисует вовсе. */
const channelsEnabled = computed(() => focus.value?.object.hierarchyLevel === 3);

const channels = useObjectChannelsQuery(objectId, { enabled: channelsEnabled });

/**
 * Колоночное состояние для `buildObjectGraph`. «empty» утверждается только когда запрос
 * завершился и страниц больше нет; на лету — «loading», иначе пустая колонка прочтётся
 * как «каналов нет».
 */
const channelState = computed<ChannelColumnState>(() => {
  if (!channelsEnabled.value) return "off";
  if (channels.isError.value) return "error";
  if (channels.isLoading.value || channels.isFetching.value) return "loading";
  if (channels.items.value.length === 0) return "empty";
  return "ready";
});

const graph = computed(() => {
  const node = focus.value;
  if (!node) return null;

  return buildObjectGraph({
    focus: node,
    ancestors: ancestors.value,
    channels: channels.items.value.slice(0, channelLimit.value),
    channelState: channelState.value,
    channelTotal: channels.total.value,
    hasMoreChannels: channels.hasMore.value,
    riskOfNode: registry.riskOf,
    riskOfChannel: registry.riskOfChannel,
    highlightChannel: highlightChannel.value,
    childLimit: childrenExpanded.value ? Number.MAX_SAFE_INTEGER : MAX_CHILD_OBJECT_NODES,
  });
});

const flowNodes = computed(() => (graph.value ? toFlowNodes(graph.value) : []));
const flowEdges = computed(() => (graph.value ? toFlowEdges(graph.value) : []));

/** Сколько сегментов полосы уже есть на графе — остальные затемняются. */
const shownChannels = computed(() => Math.min(channelLimit.value, channels.items.value.length));

/** Легенда обязана говорить, откуда взялся уровень: реестр или свёртка по активным прогнозам. */
const derivedRisk = computed(
  () => registry.riskSupport.value !== "supported" && registry.riskCoverage.value !== "none",
);

const isEmptyScope = computed(() => auth.isEmptyScope);
const isReady = computed(() => !registry.isLoading.value && !registry.isError.value);
const notFound = computed(() => isReady.value && !focus.value);

// ---- Поиск канала для ?highlightChannel= ----

/** Чем закончился последний скан; null — ещё не искали либо искать нечего. */
const scanVerdict = ref<{ outcome: HighlightScanOutcome; loaded: number } | null>(null);

/**
 * Скана ждём до первой страницы: до неё `hasNextPage === false` означает «данных нет»,
 * а не «канал отсутствует», и неосторожный скан выдал бы «не найдено» о объекте,
 * о котором мы ещё ничего не знаем.
 */
const scanReady = computed(() => channelsEnabled.value && !channels.isLoading.value && !channels.isError.value);

watch(
  [highlightChannel, scanReady],
  async ([channelId, ready]) => {
    if (!channelId || !ready) {
      scanVerdict.value = null;
      return;
    }

    const outcome = await channels.scanFor(channelId);
    // Адрес сменился в середине скана: вердикт прошлого канала новому не показываем.
    if (outcome === "aborted") return;
    if (outcome === "found") revealChannel(channelId);
    scanVerdict.value = { outcome, loaded: channels.items.value.length };
  },
  { flush: "post" },
);

/** Подсветка работает только по отрисованному узлу — поднимаем потолок до нужного индекса. */
function revealChannel(channelId: string) {
  const index = channels.indexOf(channelId);
  if (index >= channelLimit.value) channelLimit.value = index + 1;
}

/**
 * «+ ещё» на каналах: сначала поднимаем потолок отрисовки, затем, если принятых данных
 * не хватает, просим следующую страницу. Обратный порядок выглядел бы как игнорированный
 * клик, пока запрос в полёте.
 */
function revealMoreChannels() {
  channelLimit.value += CHANNEL_NODE_LIMIT;
  if (channelLimit.value > channels.items.value.length && channels.hasMore.value) void channels.fetchNextPage();
}

const scanProgress = computed(() =>
  channels.isScanning.value && highlightChannel.value
    ? `${CHANNEL_SEARCH_PREFIX} ${channels.scanPages.value ?? ""}`
    : null,
);

/**
 * Честное «не нашли»: отдельный текст на обрезанный стоп-краном скан и на исчерпанные
 * страницы — это разные решения диспетчера («проверьте ссылку» и «проверьте позже»).
 */
const highlightAlert = computed(() => {
  const verdict = scanVerdict.value;
  if (!verdict || !highlightChannel.value || graph.value?.highlightedId) return null;

  return verdict.outcome === "truncated"
    ? channelScanTruncatedText(verdict.loaded, HIGHLIGHT_SCAN_MAX_PAGES)
    : channelNotFoundText(verdict.loaded, channels.total.value);
});

/** Смена объекта — вид собирается заново: потолок отрисовки и вердикт прошлого скана к нему не относятся. */
watch(objectId, () => {
  channelLimit.value = CHANNEL_NODE_LIMIT;
  childrenExpanded.value = false;
  scanVerdict.value = null;
});

function selectObject(id: string) {
  // Query перезаписываем целиком: подсветка чужого канала на новом объекте бессмысленна.
  router.replace({ name: "object-graph", params: { id }, query: {} });
}

function focusChannel(channelId: string) {
  revealChannel(channelId);
  router.replace({ name: "object-graph", params: { id: objectId.value }, query: { highlightChannel: channelId } });
}

function onAuxClick(id: string) {
  if (id === GRAPH_ID.moreChildren) childrenExpanded.value = true;
  else if (id === GRAPH_ID.moreChannels) revealMoreChannels();
  else if (id === GRAPH_ID.state("error")) void channels.refetch();
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
      <el-alert v-if="highlightAlert" type="warning" :title="highlightAlert" :closable="false" show-icon />

      <ChannelStripMap
        v-if="channelsEnabled && channels.items.value.length"
        :channels="channels.items.value"
        :risk-of="registry.riskOfChannel"
        :shown-count="shownChannels"
        :highlighted-id="highlightChannel"
        :total="channels.total.value"
        :progress="scanProgress"
        @select="focusChannel"
      />

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
