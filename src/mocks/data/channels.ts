import type { Channel } from "@/modules/channels/types";
import type { InfrastructureObject } from "@/modules/objects/types";
import { mockPredictions } from "./predictions";
import {
  HUGE_CHANNELS_ID,
  MANY_CHANNELS_ID,
  OBJECT_UNKNOWN_CHANNEL_COUNT_ID,
  UNKNOWN_COUNT_CHANNEL_SIZE,
  mockObjects,
} from "./objects";
import { makePickers } from "../lib/seededRandom";

/**
 * Реестр каналов для мока `GET /channels`.
 *
 * Число каналов на объект берётся из `channelCount` реестра (`data/objects.ts`), иначе
 * колонка «Каналов» и «+ ещё N» на графе расходились бы — и проверка показывала бы баг
 * там, где его нет. Исключение — `OBJECT_UNKNOWN_CHANNEL_COUNT_ID`: там `channelCount: null`,
 * а каналы живые, ровно чтобы увидеть «прочерк в списке + счётчик по X-Total-Count».
 *
 * Часть id не выдумана, а взята из `context.channelId` мок-прогнозов: только так каналы
 * светятся производным риском, а полоса-мини-карта показывает разные уровни, а не серый ряд.
 *
 * Физический порядок — порядок генерации. По риску не сортируем: бэк порядка выдачи
 * `/channels` не обещал (вопрос бэкенду № 1), поэтому «соседний узел ≠ соседний на трассе»,
 * и любая перестановка была бы выдумкой.
 */

/** Те же подписи, что в `data/generatePredictions.ts`: канал и прогноз говорят одним языком. */
const SENSOR_TYPES = [
  "Датчик температуры",
  "Датчик давления",
  "Датчик дыма",
  "Датчик движения",
  "Датчик уровня",
  "Датчик влажности",
];

const ENGINEERING_SYSTEMS = [
  "Температурная подсистема",
  "Подсистема пожаротушения",
  "Подсистема водоотведения",
  "Подсистема вентиляции",
  "Подсистема электроснабжения",
];

function realChannelIds(): string[] {
  const now = Date.now();
  const seen = new Set<string>();

  for (const prediction of mockPredictions) {
    const id = prediction.context?.channelId;
    if (!id) continue;
    // Только активные на момент загрузки: производный риск строится по
    // `/predictions?activeOnly=true`, истёкший прогноз канал не раскрасит.
    if (Date.parse(prediction.computedAt) > now || now >= Date.parse(prediction.horizonUntil)) continue;
    seen.add(id);
  }

  // Сортировка по числу — детерминизм: порядок Set зависит от порядка прогнозов,
  // а перестановка тут молча перекрасила бы всё демо.
  return [...seen].sort((a, b) => Number(a) - Number(b));
}

function litTarget(object: InfrastructureObject, total: number): number {
  if (object.id === HUGE_CHANNELS_ID) return 20;
  if (object.id === MANY_CHANNELS_ID) return 12;
  return Math.max(1, Math.min(4, Math.round(total / 8)));
}

function buildChannels(objects: InfrastructureObject[]): Channel[] {
  const { int, chance } = makePickers(19720101);
  const pool = realChannelIds();
  const channels: Channel[] = [];

  let cursor = 0;
  let synthetic = 100_000;

  // Дедуп по id — то же правило «первая запись выигрывает», что в buildObjectTree.
  // Без него повторная строка id «7» удвоила бы список каналов, и «Каналов» в списке
  // перестал бы сходиться с X-Total-Count — ровно тот баг, который здесь ищут глазами.
  const done = new Set<string>();

  for (const item of objects) {
    if (item.hierarchyLevel !== 3) continue;
    if (done.has(item.id)) continue;
    done.add(item.id);

    const total = item.id === OBJECT_UNKNOWN_CHANNEL_COUNT_ID ? UNKNOWN_COUNT_CHANNEL_SIZE : (item.channelCount ?? 0);

    // Подсвеченные каналы разбрасываем по списку, а не ставим в начало: иначе полоса-карта
    // выглядела бы как «риск только в начале», хотя она про положение на объекте.
    const want = Math.max(0, Math.min(litTarget(item, total), pool.length - cursor, total));
    const litPositions = new Set<number>();
    for (let i = 0; i < want; i += 1) {
      litPositions.add(Math.floor(((i + 1) * total) / (want + 1)));
    }

    for (let position = 0; position < total; position += 1) {
      const sensorType = SENSOR_TYPES[(position + int(0, 1)) % SENSOR_TYPES.length];
      const id = litPositions.has(position) ? (pool[cursor++] as string) : String(synthetic++);

      channels.push({
        id,
        objectId: item.id,
        sensorType,
        engineeringSystem: ENGINEERING_SYSTEMS[position % ENGINEERING_SYSTEMS.length],
        // null name — штатный случай: узел обязан показать id, а не пустую подпись.
        name: chance(0.15) ? null : `${sensorType} №${position + 1}`,
        known: chance(0.96),
      });
    }
  }

  // Три стабильных id для ручной проверки переходов и особых состояний канала. Менять
  // нельзя — на них ссылает описание ниже. Позиции 0/1 и хвост: подсвеченные id из пула
  // стоят глубже, так что ни один прогноз-носитель не теряется.
  //
  //   /objects/94?highlightChannel=900000001 — канал на первой странице, граф центрируется;
  //   /objects/94?highlightChannel=900000002 — known: false (ADR-014): узел показывается
  //     пунктиром с бейджем «нет в реестре», а не отфильтровывается;
  //   /objects/95?highlightChannel=900000003 — хвост за 20 страницами из 25: скан
  //     останавливается на HIGHLIGHT_SCAN_MAX_PAGES и пишет «упёрлись в лимит», а не «нет»;
  //   /objects/94?highlightChannel=999999 — id нет нигде: «не найден среди N из M каналов».
  //
  // Все id — строки из цифр по схеме контракта (^[1-9][0-9]{0,18}$): «ch-…» прошло бы тип
  // string, но выглядело бы как данные из другой системы и сломало бы любой числовой порядок.
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

/** Каналы одного объекта в физическом порядке; `objectId: null` в индекс не попадает. */
export function channelsOf(objectId: string): Channel[] {
  return channelsByObject.get(objectId) ?? [];
}
