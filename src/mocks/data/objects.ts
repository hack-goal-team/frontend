import type { HierarchyLevel, InfrastructureObject, ObjectKind } from "@/modules/objects/types";

/**
 * Реестр объектов для мока `GET /objects`.
 *
 * Держимся контракта буквально, иначе проверка экрана ничего не проверяет: схема
 * `InfrastructureObject` = {id, parentId, hierarchyLevel, kind, name, snapshotAt} плюс
 * `risk` — и тот приписывает хендлер только на `withRisk=true` (см. `lib/mockRisk`);
 * в самой карте записей поля `risk` нет. Число каналов фронт по-прежнему берёт из
 * `X-Total-Count` `/channels`.
 *
 * - выдача — ГОЛЫЙ массив, пагинации нет; счётчик в `X-Total-Count` отдаёт хендлер.
 * - `parentId` может вести на объект, которого в реестре нет — «не чиним, отдаём как есть».
 * - названия обезличены греческими буквами, как говорит описание ручки.
 *
 * Id уровня 3 — источник для прогнозов: `data/generatePredictions.ts` привязывает контекст
 * к реальным объектам отсюда (`mockLevel3Objects`) и их каналам (`channelsOf`), поэтому
 * производный риск в реестре nonzero, а `spawnCriticalPrediction` по SSE перекрашивает
 * существующие узлы, а не пустоту.
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
/** Много каналов (120 — см. `SPECIAL_CHANNEL_COUNTS` в data/channels.ts): 30 узлов + «+ ещё N». */
export const MANY_CHANNELS_ID = "94";
/** 2 500 каналов: 25 страниц по 100 — дальше `HIGHLIGHT_SCAN_MAX_PAGES` обрывает скан. */
export const HUGE_CHANNELS_ID = "95";
/** Пустой список каналов → `AuxGraphNode` «Каналов нет», граф цел. */
export const OBJECT_WITHOUT_CHANNELS_ID = "97";
/** Хендлер `/channels` отвечает на этот объект 503 → узел «Каналы не загрузились» + повтор по клику. */
export const OBJECT_CHANNELS_DOWN_ID = "96";

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
 * Объекты уровня 3: id 1…9 и 30…80 — всего 60 записей. Id 80 удобен для проверки
 * «вне области видимости»: он существует для scope ALL, но не входит в поддерево техника.
 */
const OBJECT_IDS = [...range(1, 9), ...range(30, 80)];

function range(from: number, to: number): string[] {
  const out: string[] = [];
  for (let i = from; i <= to; i += 1) out.push(String(i));
  return out;
}

function object(id: string, level: HierarchyLevel, parentId: string | null, name: string | null): InfrastructureObject {
  return {
    id,
    parentId,
    hierarchyLevel: level,
    kind: KIND_BY_LEVEL[level],
    name,
    snapshotAt: SNAPSHOT_AT,
  };
}

function buildRegistry(): InfrastructureObject[] {
  const items: InfrastructureObject[] = [];

  DISTRICTS.forEach((district) => {
    items.push(object(district.id, 1, null, district.name));
  });

  // Комплекс цепляется за район кругово: дерево получается широким, а не палкой.
  const districtId = (i: number) => DISTRICTS[i % DISTRICTS.length].id;

  COMPLEX_IDS.forEach((id, i) => {
    items.push(object(id, 2, districtId(i), `Комплекс ${GREEK[i % GREEK.length]}`));
  });

  // «Объект Альфа» под id 5 — намеренно: так в моке сходятся реестр и scope техника.
  const nameFor = (id: string, i: number) =>
    id === OBJECT_TECHNICIAN_SCOPE_ID ? "Объект Альфа" : `Объект ${GREEK[i % GREEK.length]}-${id}`;

  OBJECT_IDS.forEach((id, i) => {
    items.push(object(id, 3, COMPLEX_IDS[i % COMPLEX_IDS.length], nameFor(id, i)));
  });

  // ---- Специальные записи: каждая закрывает строку матрицы проверки ----

  items.push(object(OBJECT_NO_NAME_ID, 3, COMPLEX_IDS[0], null));
  items.push(object(OBJECT_UNKNOWN_PARENT_ID, 3, "999999", "Объект с потерянным родителем"));
  items.push(object(CYCLE_OBJECT_IDS[0], 2, CYCLE_OBJECT_IDS[1], "Комплекс Цикл-А"));
  items.push(object(CYCLE_OBJECT_IDS[1], 2, CYCLE_OBJECT_IDS[0], "Комплекс Цикл-Б"));
  items.push(object(MANY_CHANNELS_ID, 3, COMPLEX_IDS[1], "Магистральный коллектор-120"));
  items.push(object(HUGE_CHANNELS_ID, 3, COMPLEX_IDS[2], "Коллектор-2500 (проверка стоп-крана)"));
  items.push(object(OBJECT_CHANNELS_DOWN_ID, 3, COMPLEX_IDS[3], "Объект без реестра каналов (503)"));
  items.push(object(OBJECT_WITHOUT_CHANNELS_ID, 3, COMPLEX_IDS[4], "Объект без каналов"));

  // Дубликат — ровно одна повторная запись того же id: «первая выигрывает» в buildObjectTree.
  items.push(object(DUPLICATED_OBJECT_ID, 3, COMPLEX_IDS[5], `${nameFor(DUPLICATED_OBJECT_ID, 5)} (дубликат)`));

  return items;
}

/** 95 записей: 6 + 20 + 60 + 8 + 1 дубликат. */
export const mockObjects: InfrastructureObject[] = buildRegistry();

/**
 * Объекты уровня 3 без дубликатов — база привязки прогнозов к объектам и каналам
 * (`generatePredictions`, `spawnCriticalPrediction`). Дедуп по id — то же правило
 * «первая запись выигрывает», что в buildObjectTree.
 */
export const mockLevel3Objects: InfrastructureObject[] = (() => {
  const seen = new Set<string>();
  const result: InfrastructureObject[] = [];
  for (const item of mockObjects) {
    if (item.hierarchyLevel !== 3) continue;
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    result.push(item);
  }
  return result;
})();
