import type { HierarchyLevel, InfrastructureObject, ObjectKind } from "@/modules/objects/types";
import { makePickers } from "../lib/seededRandom";

/**
 * Реестр объектов для мока `GET /objects`.
 *
 * Держимся контракта (`docs/openapi-frontend.yaml` v0.2.0, схема `InfrastructureObject`)
 * буквально, иначе проверка экрана ничего не проверяет:
 *
 * - `risk` НЕ отдаём никогда, хотя фронт шлёт `withRisk=true` — параметр принимается,
 *   поля нет (yaml:420-422). Это единственный способ увидеть живую фолбэк-цепочку
 *   «реестр → производный из активных прогнозов → недоступен».
 * - выдача — ГОЛЫЙ массив, пагинации нет; счётчик в `X-Total-Count` отдаёт хендлер.
 * - `parentId` может вести на объект, которого в реестре нет (yaml:950-954) — «не чиним,
 *   отдаём как есть».
 * - названия обезличены греческими буквами, как говорит описание ручки (yaml:415).
 *
 * Отдельно разложены id: их специально берём из диапазона 1…100, потому что
 * `data/generatePredictions.ts` атрибутит прогнозы на `context.objectId = 1…100`.
 * Только так производный риск в реестре nonzero, а `spawnCriticalPrediction` (objectIds
 * 1…20) по SSE перекрашивает существующие узлы, а не пустоту.
 */

const GREEK = [
  "Альфа",
  "Бета",
  "Гамма",
  "Дельта",
  "Эпсилон",
  "Дзета",
  "Эта",
  "Тета",
  "Йота",
  "Каппа",
  "Лямбда",
  "Мю",
  "Ню",
  "Кси",
  "Омикрон",
  "Пи",
  "Ро",
  "Сигма",
  "Тау",
  "Упсилон",
  "Фи",
  "Хи",
  "Пси",
  "Омега",
] as const;

/** Снимок реестра — одна дата на всю выдачу: это снапшот (ADR-015), а не момент запроса. */
const SNAPSHOT_AT = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

// ---- Опорные id: их читают хендлеры и data/channels.ts ----

/** Корень области видимости техника (`scope.objectIds: [5]` в `handlers/auth.ts`). */
export const OBJECT_TECHNICIAN_SCOPE_ID = "5";
/** Корень области видимости диспетчера района (`scope.objectIds: [5773]`). */
export const OBJECT_DISTRICT_SCOPE_ID = "5773";

/** `name: null` → фолбэк «Объект #90» и id в подсказке. */
export const OBJECT_NO_NAME_ID = "90";
/** `parentId` в несуществующий объект → тег «осиротел», граф без колонки предков. */
export const OBJECT_UNKNOWN_PARENT_ID = "91";
/** Взаимная ссылка 92 ↔ 93 → цикл, разрываемый в корни; страница не виснет. */
export const CYCLE_OBJECT_IDS = ["92", "93"] as const;
/** Этот id встречается в выдаче дважды → дедупликация дерева, `stats.duplicates = 1`. */
export const DUPLICATED_OBJECT_ID = "7";
/** `channelCount: null` при живых каналах → колонка «—», а «+ ещё N» считается по заголовку. */
export const OBJECT_UNKNOWN_CHANNEL_COUNT_ID = "33";
/** Много каналов: 30 узлов + «+ ещё N» и догрузка по клику. */
export const MANY_CHANNELS_ID = "94";
/** 2 500 каналов: 25 страниц по 100 — дальше `HIGHLIGHT_SCAN_MAX_PAGES` обрывает скан. */
export const HUGE_CHANNELS_ID = "95";
/** Пустой список каналов → `AuxGraphNode` «Каналов нет», граф цел. */
export const OBJECT_WITHOUT_CHANNELS_ID = "97";
/** Хендлер `/channels` отвечает на этот объект 503 → узел «Каналы не загрузились» + повтор по клику. */
export const OBJECT_CHANNELS_DOWN_ID = "96";

export const MANY_CHANNELS_COUNT = 120;
export const HUGE_CHANNELS_COUNT = 2_500;
/** Сколько каналов реально отдать для `OBJECT_UNKNOWN_CHANNEL_COUNT_ID`, если `channelCount` = null. */
export const UNKNOWN_COUNT_CHANNEL_SIZE = 12;

const KIND_BY_LEVEL: Record<HierarchyLevel, ObjectKind> = {
  1: "district",
  2: "controlHouse",
  3: "guardObject",
};

const DISTRICTS: { id: string; name: string }[] = [
  { id: OBJECT_DISTRICT_SCOPE_ID, name: "Район Северный" },
  { id: "5774", name: "Район Западный" },
  { id: "5775", name: "Район Южный" },
  { id: "5776", name: "Район Восточный" },
  { id: "5777", name: "Район Центральный" },
  { id: "5778", name: "Район Заречный" },
];

/** Комплексы: id 10…29, висячие каналы у них не бывают — уровень 2 по контракту без каналов. */
const COMPLEX_IDS = range(10, 29);
/**
 * Объекты уровня 3: id 1…9 и 30…80 — всего 60 записей. Диапазон выбран так, чтобы
 * пересекаться с `context.objectId` мок-прогнозов (1…100) — иначе производный риск в
 * реестре был бы всюду пустой. Id 80 удобен для проверки «вне области видимости»: он
 * существует для scope ALL, но не входит в поддерево техника.
 */
const OBJECT_IDS = [...range(1, 9), ...range(30, 80)];

function range(from: number, to: number): string[] {
  const out: string[] = [];
  for (let i = from; i <= to; i += 1) out.push(String(i));
  return out;
}

function object(
  id: string,
  level: HierarchyLevel,
  parentId: string | null,
  name: string | null,
  channelCount?: number | null,
): InfrastructureObject {
  const record: InfrastructureObject = {
    id,
    parentId,
    hierarchyLevel: level,
    kind: KIND_BY_LEVEL[level],
    name,
    snapshotAt: SNAPSHOT_AT,
  };
  // Уровень 1 остаётся без поля: «нет данных» ≠ «0 каналов» ≠ «прогнозов нет».
  if (channelCount !== undefined) record.channelCount = channelCount;
  return record;
}

function buildRegistry(): InfrastructureObject[] {
  const { int, chance } = makePickers(20260922);
  const items: InfrastructureObject[] = [];

  DISTRICTS.forEach((district) => {
    items.push(object(district.id, 1, null, district.name));
  });

  // Комплекс цепляется за район кругово: дерево получается широким, а не палкой.
  const districtId = (i: number) => DISTRICTS[i % DISTRICTS.length].id;

  COMPLEX_IDS.forEach((id, i) => {
    items.push(object(id, 2, districtId(i), `Комплекс ${GREEK[i % GREEK.length]}`, 0));
  });

  // «Объект Альфа» под id 5 — намеренно: так в моке сходятся реестр и scope техника.
  const nameFor = (id: string, i: number) =>
    id === OBJECT_TECHNICIAN_SCOPE_ID ? "Объект Альфа" : `Объект ${GREEK[i % GREEK.length]}-${id}`;

  OBJECT_IDS.forEach((id, i) => {
    // 3…38 каналов и у четверти объектов сразу +30: иначе «+ ещё N» никто не увидит.
    const channels = id === OBJECT_UNKNOWN_CHANNEL_COUNT_ID ? null : int(3, 38) + (chance(0.25) ? 30 : 0);
    items.push(object(id, 3, COMPLEX_IDS[i % COMPLEX_IDS.length], nameFor(id, i), channels));
  });

  // ---- Специальные записи: каждая закрывает строку матрицы проверки ----

  items.push(object(OBJECT_NO_NAME_ID, 3, COMPLEX_IDS[0], null, 8));
  items.push(object(OBJECT_UNKNOWN_PARENT_ID, 3, "999999", "Объект с потерянным родителем", 6));
  items.push(object(CYCLE_OBJECT_IDS[0], 2, CYCLE_OBJECT_IDS[1], "Комплекс Цикл-А", 0));
  items.push(object(CYCLE_OBJECT_IDS[1], 2, CYCLE_OBJECT_IDS[0], "Комплекс Цикл-Б", 0));
  items.push(object(MANY_CHANNELS_ID, 3, COMPLEX_IDS[1], "Магистральный коллектор-120", MANY_CHANNELS_COUNT));
  items.push(object(HUGE_CHANNELS_ID, 3, COMPLEX_IDS[2], "Коллектор-2500 (проверка стоп-крана)", HUGE_CHANNELS_COUNT));
  items.push(object(OBJECT_CHANNELS_DOWN_ID, 3, COMPLEX_IDS[3], "Объект без реестра каналов (503)", 40));
  items.push(object(OBJECT_WITHOUT_CHANNELS_ID, 3, COMPLEX_IDS[4], "Объект без каналов", 0));

  // Дубликат — ровно одна повторная запись того же id: «первая выигрывает» в buildObjectTree.
  items.push(object(DUPLICATED_OBJECT_ID, 3, COMPLEX_IDS[5], `${nameFor(DUPLICATED_OBJECT_ID, 5)} (дубликат)`, 7));

  return items;
}

/** 95 записей, как обещает описание ручки (yaml:417): 6 + 20 + 60 + 8 + 1 дубликат. */
export const mockObjects: InfrastructureObject[] = buildRegistry();
