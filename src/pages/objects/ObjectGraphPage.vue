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
import { channelPredictionOf, channelRiskOf } from "@/modules/objects/lib/risk";
import type { NodeRisk } from "@/modules/objects/types";
import type { Channel } from "@/modules/channels/types";
import { usePredictionQuery } from "@/modules/predictions/composables/usePredictionQuery";
import { useLabels } from "@/modules/reference/composables/useLabels";
import SidePanel from "@/shared/ui/SidePanel.vue";
// Панель деталей прогноза принадлежит журналу прогнозов; своя разметка здесь означала бы
// две версии одного экрана, расходящиеся при каждой правке состава.
import PredictionPanelContent from "@/pages/predictions/components/PredictionPanelContent.vue";
import PredictionPanelSkeleton from "@/pages/predictions/components/skeletons/PredictionPanelSkeleton.vue";
import ChannelStripMap from "./components/ChannelStripMap.vue";
import ObjectGraphCanvas from "./components/ObjectGraphCanvas.vue";
import ObjectGraphHeading from "./components/ObjectGraphHeading.vue";
import ObjectGraphLegend from "./components/ObjectGraphLegend.vue";
import GraphSkeleton from "./components/skeletons/GraphSkeleton.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const registry = useObjectRegistry();
const { incidentTypeLabel } = useLabels();

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
 * Прогноз, открытый в боковой панели: то же имя параметра, что в журнале прогнозов
 * (`?selectedId=`), — одна ссылка должна работать с любого экрана.
 */
const selectedPrediction = computed<string | null>(() => {
  const raw = route.query.selectedId;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value !== "" ? value : null;
});

const {
  data: predictionDetail,
  isLoading: isDetailLoading,
  isError: isDetailError,
  error: detailError,
} = usePredictionQuery(selectedPrediction);

/**
 * Разворот «+ ещё» для детей-объектов. Это не фильтр и не выбор объекта — они в URL, —
 * а способ показать уже принятые узлы; на ссылку и на выдачу влияния нет.
 */
const childrenExpanded = ref(false);

/**
 * Потолок каналов на графе, поднятый кликом «+ ещё»: страницы догружаются запросом,
 * но узлы не ждут ответа. Подсветка из URL потолок не двигает — она учитывается в
 * `channelCeiling`, иначе зависела бы от того, успел ли запуститься скан.
 */
const channelLimit = ref(CHANNEL_NODE_LIMIT);

const focus = computed(() => registry.nodeById(objectId.value));

const ancestors = computed(() => (focus.value ? registry.ancestorsOf(focus.value.id) : []));

/** У уровня 2 каналов по контракту нет; неизвестный id экран не рисует вовсе. */
const channelsEnabled = computed(() => focus.value?.object.hierarchyLevel === 3);

const channels = useObjectChannelsQuery(objectId, { enabled: channelsEnabled });

/**
 * Риск канала — серверный: страницы `/channels` запрошены с `withRisk=true` и `risk`
 * приехал в каждой записи. Отдельного скана прогнозов нет; `risk: null` — утверждение
 * «активных прогнозов у канала нет», отсутствующее поле — «не знаем» (прочерк).
 */
function riskOfChannel(channel: Channel): NodeRisk | null {
  return channelRiskOf(channel);
}

/** Прогноз, раскрасивший канал — `risk.predictionId` той же записи канала. */
function predictionOfChannel(channel: Channel): string | null {
  return channelPredictionOf(channel);
}

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

/**
 * Потолок отрисовки каналов. Подсветка учитывается здесь, а не «поднимается» сканом:
 * канал уже в принятых данных — значит узел обязан быть на схеме, независимо от того,
 * запускался ли скан и чем он кончился. Иначе `?highlightChannel=` из URL рисует
 * подсветку только на полосе (она читает `items` целиком), а граф остаётся на 30 узлах.
 */
const channelCeiling = computed(() => {
  const index = highlightChannel.value ? channels.indexOf(highlightChannel.value) : -1;
  return index >= 0 ? Math.max(channelLimit.value, index + 1) : channelLimit.value;
});

const graph = computed(() => {
  const node = focus.value;
  if (!node) return null;

  return buildObjectGraph({
    focus: node,
    ancestors: ancestors.value,
    channels: channels.items.value.slice(0, channelCeiling.value),
    channelState: channelState.value,
    channelTotal: channels.total.value,
    hasMoreChannels: channels.hasMore.value,
    riskOfNode: registry.riskOf,
    riskOfChannel,
    predictionOfChannel,
    highlightChannel: highlightChannel.value,
    childLimit: childrenExpanded.value ? Number.MAX_SAFE_INTEGER : MAX_CHILD_OBJECT_NODES,
  });
});

const flowNodes = computed(() => (graph.value ? toFlowNodes(graph.value) : []));
const flowEdges = computed(() => (graph.value ? toFlowEdges(graph.value) : []));

/** Сколько сегментов полосы уже есть на графе — остальные затемняются. */
const shownChannels = computed(() => Math.min(channelCeiling.value, channels.items.value.length));

const isEmptyScope = computed(() => auth.isEmptyScope);
const isReady = computed(() => !registry.isLoading.value && !registry.isError.value);
const notFound = computed(() => isReady.value && !focus.value);

// ---- Поиск канала для ?highlightChannel= ----

/** Чем закончился последний скан; null — ещё не искали либо искать нечего. */
const scanVerdict = ref<{ outcome: HighlightScanOutcome; loaded: number } | null>(null);

/**
 * Скана ждём до ПЕРВОЙ СТРАНИЦЫ каналов, а не до `!isLoading`: у запроса, который ещё
 * не стартовал (`enabled` зависит от реестра) или отключён пустой областью, `isLoading`
 * ложный, а `hasNextPage === false` там означает «данных нет», а не «канала нет» —
 * неосторожный скан выдал бы «не найдено» о объекте, о котором мы ещё ничего не знаем.
 * Число страниц — единственный честный признак «первый ответ получен».
 */
const scanReady = computed(() => channelsEnabled.value && !channels.isError.value && channels.pageTotal.value > 0);

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
    scanVerdict.value = { outcome, loaded: channels.items.value.length };
  },
  // `immediate`: обе зависимости истинны с первого кадра, когда каналы объекта уже в кэше
  // (переход из журнала, повторный вход в пределах staleTime) — без него скан не стартовал бы
  // вовсе и следующие оффсеты не догрузились бы.
  { flush: "post", immediate: true },
);

/** Остальные параметры бережём: открытая панель прогноза от навигации по полосе не уходит. */
function focusChannel(channelId: string) {
  router.replace({
    name: "object-graph",
    params: { id: objectId.value },
    query: { ...route.query, highlightChannel: channelId },
  });
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
  // Прогноз прошлого объекта в панели — уже не про то, что на экране: панель оставляем только
  // тогда, когда её сюда привёл «Показать на схеме» самого прогноза.
  if (selectedPrediction.value) closePredictionPanel();
});

function selectObject(id: string) {
  // Query перезаписываем целиком: подсветка чужого канала на новом объекте бессмысленна.
  router.replace({ name: "object-graph", params: { id }, query: {} });
}

/**
 * «Назад» из шапки ведёт в реестр. Пришли из реестра — браузерный назад вернёт его
 * вместе с фильтрами в URL; пришли по ссылке (прогнозы, уведомления) или перезагрузкой —
 * истории реестра нет, и назад увёл бы из приложения, поэтому прямой переход на /objects.
 */
function goToRegistry() {
  const back = router.options.history.state.back;
  if (typeof back === "string" && (back === "/objects" || back.startsWith("/objects?"))) {
    router.back();
  } else {
    router.push({ name: "objects" });
  }
}

/**
 * Клик по карточке канала — детали прогноза, который этот канал и раскрасил. Прогноза нет
 * (в смысле — канал не светится активным) и карта пустая: молча выходим, мёртвый клик
 * хуже отсутствующей подсказки.
 */
function openChannelPrediction(channelId: string) {
  const channel = channels.items.value.find((item) => item.id === channelId);
  const predictionId = channel ? predictionOfChannel(channel) : null;
  if (predictionId) router.replace({ query: { ...route.query, selectedId: predictionId } });
}

/** Из карточки инцидента — в прогноз отказа того же датчика; push, чтобы «Назад» вернул инцидент. */
function openRelatedPrediction(predictionId: string) {
  router.push({ query: { ...route.query, selectedId: predictionId } });
}

function closePredictionPanel() {
  const rest = { ...route.query };
  delete rest.selectedId;
  router.replace({ query: rest });
}

/**
 * «Показать на схеме» из панели. Если прогноз относится к текущему объекту — только
 * подсвечиваем узел: закрывать панель ради карточки, которая и так на экране, значит
 * заставлять диспетчера открывать её заново.
 */
function showPredictionOnGraph(targetObjectId: string, channelId?: string) {
  if (targetObjectId === objectId.value) {
    if (channelId) focusChannel(channelId);
    return;
  }
  router.replace({
    name: "object-graph",
    params: { id: targetObjectId },
    query: channelId ? { highlightChannel: channelId } : {},
  });
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
    @back="goToRegistry"
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
        :risk-of="riskOfChannel"
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
        @channel-click="openChannelPrediction"
      />

      <ObjectGraphLegend />
    </template>
  </div>

  <SidePanel
    :visible="!!selectedPrediction"
    :title="predictionDetail ? incidentTypeLabel(predictionDetail.prediction.incidentType) : 'Прогноз'"
    size="600px"
    @close="closePredictionPanel"
  >
    <PredictionPanelSkeleton v-if="isDetailLoading" />

    <el-alert
      v-else-if="isDetailError"
      type="error"
      :title="`Ошибка загрузки: ${(detailError as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <PredictionPanelContent
      v-else-if="predictionDetail"
      :detail="predictionDetail"
      @show-on-graph="showPredictionOnGraph"
      @open-prediction="openRelatedPrediction"
    />

    <el-empty v-else description="Данные недоступны" />
  </SidePanel>
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
