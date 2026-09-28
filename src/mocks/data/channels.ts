import type { Channel } from "@/modules/channels/types";
import type { InfrastructureObject } from "@/modules/objects/types";
import {
  HUGE_CHANNELS_ID,
  MANY_CHANNELS_ID,
  OBJECT_CHANNELS_DOWN_ID,
  OBJECT_WITHOUT_CHANNELS_ID,
  mockObjects,
} from "./objects";
import { makePickers } from "../lib/seededRandom";

/**
 * Реестр каналов для мока `GET /channels`.
 *
 * Число каналов на объект — локальная карта `SPECIAL_CHANNEL_COUNTS` + формула: поля
 * `channelCount` у объекта в контракте v0 нет, и «+ ещё N» на графе считается только
 * по X-Total-Count `/channels`. Спец-сценарии (33 → 12, 94 → 120, 95 → 2500, 96 → 40,
 * 97 → 0) закрывают строки матрицы проверки.
 *
 * Id каналов собственные числовые (`^[1-9][0-9]{0,18}$`), НЕ из прогнозов: направление
 * зависимости теперь «прогнозы ссылаются на каналы» (`generatePredictions` выбирает канал
 * объекта), а не наоборот. Раньше каналы заимствовали id из `context.channelId` прогнозов —
 * объектный скан `/predictions?objectId=` с реестром каналов тогда не сходился.
 *
 * Пикеты у каналов случайные (85% каналов), порядок генерации им не соответствует — как
 * и на реальном бэке, порядок по трассе наводит фронт (`mergeChannelPages` сортирует по
 * `piket`, null в конец). По риску не сортируем: «проблемный канал идёт следующим» —
 * выдумка о трассе.
 */

/**
 * Подписи каналов — источник для `context` прогнозов: канал и прогноз говорят одним языком.
 * code — строка типа (она же `context.sensorType` и code в `/reference-data.sensorTypes`),
 * system — инженерная система реестра, к которой относится тип,
 * incidentClass — класс инцидента этого типа; у типов вне четырёх класса поля нет.
 */
export const SENSOR_TYPES: {
  code: string;
  system: string;
  incidentClass?: "FIRE" | "FLOOD" | "GAS" | "INTRUSION";
}[] = [
  { code: "Датчик температуры", system: "Температурная подсистема" },
  { code: "Датчик давления", system: "Подсистема электроснабжения" },
  { code: "Датчик дыма", system: "Подсистема пожаротушения", incidentClass: "FIRE" },
  { code: "Датчик движения", system: "Подсистема электроснабжения", incidentClass: "INTRUSION" },
  { code: "Датчик уровня", system: "Подсистема водоотведения", incidentClass: "FLOOD" },
  { code: "Датчик влажности", system: "Подсистема вентиляции" },
];

/**
 * Число каналов для объектов матрицы проверки; остальные объекты уровня 3 — формулой
 * `3…38` и у четверти сразу `+30`, иначе «+ ещё N» никто не увидит.
 * 33 — обычный объект с 12 каналами: счётчик «+ ещё N» считается по X-Total-Count.
 */
const SPECIAL_CHANNEL_COUNTS: Record<string, number> = {
  "33": 12,
  [MANY_CHANNELS_ID]: 120,
  [HUGE_CHANNELS_ID]: 2_500,
  [OBJECT_CHANNELS_DOWN_ID]: 40,
  [OBJECT_WITHOUT_CHANNELS_ID]: 0,
};

function buildChannels(objects: InfrastructureObject[]): Channel[] {
  const { int, chance } = makePickers(19720101);
  const channels: Channel[] = [];

  let synthetic = 100_000;

  // Дедуп по id объекта — то же правило «первая запись выигрывает», что в buildObjectTree.
  // Без него повторная строка id «7» удвоила бы список каналов, и число каналов перестал бы
  // сходиться с X-Total-Count — ровно тот баг, который здесь ищут глазами.
  const done = new Set<string>();

  for (const item of objects) {
    if (item.hierarchyLevel !== 3) continue;
    if (done.has(item.id)) continue;
    done.add(item.id);

    const total = SPECIAL_CHANNEL_COUNTS[item.id] ?? int(3, 38) + (chance(0.25) ? 30 : 0);

    for (let position = 0; position < total; position += 1) {
      const { code: sensorType, system } = SENSOR_TYPES[(position + int(0, 1)) % SENSOR_TYPES.length];
      const id = String(synthetic++);
      // Пикет есть не у всех: поле в контракте optional — «нет данных» должно встречаться.
      const piket = chance(0.85) ? int(1, 9999) : undefined;

      channels.push({
        id,
        objectId: item.id,
        sensorType,
        engineeringSystem: system,
        // null name — штатный случай: узел обязан показать id, а не пустую подпись.
        name: chance(0.15) ? null : `${sensorType} №${position + 1}`,
        known: chance(0.96),
        piket,
        piketRaw: piket === undefined ? undefined : `ПК${piket}+${int(0, 99)}`,
        pointId: `point:${id}`,
      });
    }
  }

  // Три стабильных id для ручной проверки переходов и особых состояний канала. Менять
  // нельзя — на них ссылает описание ниже.
  //
  //   /objects/94?highlightChannel=900000001 — канал на первой странице, граф центрируется;
  //   /objects/94?highlightChannel=900000002 — known: false (ADR-014): узел показывается
  //     пунктиром с бейджем «нет в реестре», а не отфильтровывается;
  //   /objects/95?highlightChannel=900000003 — хвост за 20 страницами из 25: скан
  //     останавливается на HIGHLIGHT_SCAN_MAX_PAGES и пишет «упёрлись в лимит», а не «нет»;
  //   /objects/94?highlightChannel=999999 — id нет нигде: «не найден среди N из M каналов».
  retarget(channels, MANY_CHANNELS_ID, 0, "900000001", true);
  retarget(channels, MANY_CHANNELS_ID, 1, "900000002", false);
  retarget(channels, HUGE_CHANNELS_ID, -1, "900000003", true);

  return channels;
}

function retarget(channels: Channel[], objectId: string, index: number, id: string, known: boolean): void {
  const ofObject = channels.filter((channel) => channel.objectId === objectId);
  const target = index === -1 ? ofObject[ofObject.length - 1] : ofObject[index];
  if (!target) return;

  target.id = id;
  target.known = known;
  if (!known) target.name = null;
}

/** Один плоский массив — хендлер режет его страницами, как это делает бэк. */
export const mockChannels: Channel[] = buildChannels(mockObjects);

const channelsByObject = new Map<string, Channel[]>();
for (const channel of mockChannels) {
  const key = channel.objectId ?? "";
  const list = channelsByObject.get(key);
  if (list) list.push(channel);
  else channelsByObject.set(key, [channel]);
}

/** Каналы одного объекта в порядке генерации (по пикету отсортирует `mergeChannelPages`); `objectId: null` в индекс не попадает. */
export function channelsOf(objectId: string): Channel[] {
  return channelsByObject.get(objectId) ?? [];
}
