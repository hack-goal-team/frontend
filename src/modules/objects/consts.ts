import type { HierarchyLevel, ObjectKind } from "./types";

/**
 * Русских имён для `kind` контракт не даёт (yaml:955 — только enum), поэтому подписи
 * здешние и требуют сверки с Заказчиком: при расхождении править только этот файл.
 */
export const OBJECT_KIND_LABEL: Record<ObjectKind, string> = {
  district: "Район",
  controlHouse: "Дом управления",
  guardObject: "Охраняемый объект",
};

export const LEVEL_LABEL: Record<HierarchyLevel, string> = {
  1: "Район",
  2: "Комплекс",
  3: "Объект",
};

export const LEVEL_OPTIONS: { value: HierarchyLevel; label: string }[] = [
  { value: 1, label: LEVEL_LABEL[1] },
  { value: 2, label: LEVEL_LABEL[2] },
  { value: 3, label: LEVEL_LABEL[3] },
];

/** Значение фильтра «риска нет»; уровня риска с таким кодом в контракте нет. */
export const NO_RISK_FILTER_VALUE = "NONE";

/**
 * Честность про отсутствие топологии — в UI, а не только в документации.
 * Одно постоянное место: подпись под графом (`ObjectGraphLegend`). Второго — tooltip в шапке —
 * больше нет: тот же текст на двух элементах значит два текста, расходящихся при каждой правке.
 */
export const RELATIONS_HINT =
  "Показаны связи двух типов: иерархия объектов (родитель → потомок) и владение каналом (объект → канал). " +
  "Топологии потока — участок → участок — в контракте нет, поэтому это иерархия объекта, а не схема коллектора.";

export const OBJECTS_TITLE = "Реестр объектов";
export const GRAPH_TITLE = "Иерархия объекта";

// ---- Карточка реестра на аналитической панели: четыре состояния, все видимые ----

export const OBJECTS_CARD_TITLE = "Объектов в реестре";
export const OBJECTS_CARD_HINT = "Откройте реестр, чтобы увидеть иерархию и каналы";
/** 0 — ответ сервиса, а не пустой экран: переход по-прежнему доступен. */
export const OBJECTS_CARD_EMPTY_HINT = "Реестр пуст";
export const OBJECTS_CARD_NO_TOTAL_HINT = "Сколько объектов — неизвестно: сервис не прислал X-Total-Count";
export const OBJECTS_CARD_LOADING_HINT = "Реестр загружается…";
export const OBJECTS_CARD_ERROR_HINT = "Реестр недоступен";

export const NAME_FALLBACK_PREFIX = "Объект #";

/** channelCount: null ≠ 0 — «неизвестно» рисуется прочерком, а не нулём. */
export const UNKNOWN_VALUE = "—";

export const RISK_UNSUPPORTED_HINT = "Сведения о риске не приходят от сервиса";
/** ○ — утверждение «активных прогнозов нет», его вправе давать только завершённый источник. */
export const NO_PREDICTIONS_LABEL = "Без прогноза";
/** Диспетчеру не нужно знать про `withRisk`; технические детали — в подписи под таблицей. */
export const RISK_FILTER_DISABLED_TIP = "Фильтр по риску пока недоступен";
export const RISK_DERIVED_NOTE = "выведено из активных прогнозов";
/** Тот же смысл для узкого места — шапки колонки. */
export const RISK_DERIVED_SHORT = "из прогнозов";
/** ○ при незакрытой атрибуции была бы ложью: прогноз есть, просто не сводится к этой цели. */
export const RISK_UNATTRIBUTED_NOTE = "есть прогнозы вне объектов";
export const RISK_SCAN_PARTIAL_ALERT = "Показаны риски не по всем активным прогнозам";
export const ORPHAN_TAG = "Родитель не найден в реестре";
/** Короткая форма для узла графа: на 248px длинная подпись съедает имя объекта. */
export const ORPHAN_SHORT = "нет родителя";
export const CHANNEL_UNKNOWN_BADGE = "нет в реестре";
/** Подсказка на карточке канала: показывается только там, где прогноз реально найден. */
export const CHANNEL_OPEN_PREDICTION_HINT = "Открыть прогноз";
export const OBJECT_NOT_FOUND = "Объект не найден в вашей области видимости";
export const CHANNEL_NOT_FOUND = "Канал не найден среди {n} загруженных из {m} каналов объекта";
export const SHOW_ON_GRAPH = "Показать на схеме";
export const SHOW_ON_GRAPH_SHORT = "На схеме →";
export const NO_OBJECT_HINT = "Нет привязки к объекту";

// ---- Служебные узлы графа (колонка k+1) ----

/** «+ ещё N»: догрузка из уже принятого дерева (дети) или следующей страницы (каналы). */
export const MORE_PREFIX = "+ ещё";
export const CHANNELS_LOADING = "Каналы загружаются…";
export const CHANNELS_ERROR = "Каналы не загрузились";
export const CHANNELS_EMPTY = "Каналов нет";
/** Курсор и текст «+ ещё» говорят про клик сами; подсказка нужна только на ошибке. */
export const AUX_RETRY_HINT = "Нажмите на узел, чтобы повторить запрос";

// ---- Каналы: поиск подсветки и полоса-мини-карта ----

export const CHANNEL_SEARCH_PREFIX = "ищем канал…";

/** Вариант без X-Total-Count: обещать «из M», когда M неизвестно, нельзя. */
export const CHANNEL_NOT_FOUND_NO_TOTAL = "Канал не найден среди {n} загруженных каналов объекта";

/** Упор в стоп-кран — отдельный текст: «не нашли» и «перестали искать» разные решения. */
export const CHANNEL_SCAN_TRUNCATED =
  "Канал не найден среди {n} загруженных каналов: поиск остановлен на лимите {max} страниц";

/** Хвост полосы-мини-карты: сколько каналов ещё не прочитано. */
export const CHANNEL_STRIP_HIDDEN = "ещё {n} не загружено";

export function channelNotFoundText(loaded: number, total: number | null): string {
  return total === null
    ? CHANNEL_NOT_FOUND_NO_TOTAL.replace("{n}", String(loaded))
    : CHANNEL_NOT_FOUND.replace("{n}", String(loaded)).replace("{m}", String(total));
}

export function channelScanTruncatedText(loaded: number, maxPages: number): string {
  return CHANNEL_SCAN_TRUNCATED.replace("{n}", String(loaded)).replace("{max}", String(maxPages));
}

export function channelStripHiddenText(hidden: number): string {
  return CHANNEL_STRIP_HIDDEN.replace("{n}", String(hidden));
}

// ---- Размеры и «стоп-краны» ----

/**
 * Узлов канала на экране до появления «+ ещё N». Потолок отрисовки, а не план:
 * при ~75 узлах Vue Flow тянет панель без onlyRenderVisibleElements.
 */
export const CHANNEL_NODE_LIMIT = 30;

/** Детей-объектов сервером не лимитируем (весь реестр ~95 записей), потолок локальный. */
export const MAX_CHILD_OBJECT_NODES = 40;

/** Верхняя граница limit по контракту — размер страницы каналов. */
export const CHANNEL_PAGE_SIZE = 100;

/** Верхняя граница limit по контракту — размер страницы скана активных прогнозов. */
export const RISK_SCAN_PAGE_SIZE = 100;

/**
 * Максимум страниц адаптивного скана активных прогнозов ради производного риска.
 * Типичный прогон заканчивается сам по hasMore === false; здесь только защита от
 * незавершимости. Целесообразность проверяется по X-Total-Count первого ответа.
 */
export const RISK_SCAN_MAX_PAGES = 20;

/** То же для поиска канала по ?highlightChannel= — до подтверждения channelId-фильтра (см. § 13 плана). */
export const HIGHLIGHT_SCAN_MAX_PAGES = 20;

/**
 * Фильтр по уровню риска активен, только когда реестр реально отдаёт `risk`.
 *
 * Как включить производный риск в фильтре на демо:
 * 1. поставить `true`;
 * 2. `riskFilterEnabled` в ObjectsFilters.vue перестать брать из `support` и взять
 *    предикат из `resolveRisk().level` (точка уже есть — `useObjectRegistry().riskFilterEnabled`);
 * 3. подпись колонки «Риск» обязана переключиться на `RISK_DERIVED_NOTE` — заготовка в ObjectRiskDot.vue;
 * 4. значение `NO_RISK_FILTER_VALUE` скрывать при `coverage === "partial"`: обрезанный скан
 *    дал бы ложный «риска нет»;
 * 5. сверить с карточкой «Высокий риск» на аналитической панели: там дедуплицирование по
 *    «цель + тип», здесь максимум по строкам — цифры различаются осознанно.
 */
export const ALLOW_RISK_FILTER_FROM_DERIVED = false;

/**
 * Выключатель onlyRenderVisibleElements для Vue Flow. Не включать, пока узлов на экране
 * меньше ~300: на меньшем количестве он только даёт пустые вспышки при панорамировании.
 */
export const RENDER_ONLY_VISIBLE = false;
