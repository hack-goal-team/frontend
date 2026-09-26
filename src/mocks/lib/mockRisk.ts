import type { Channel, ChannelRisk } from "@/modules/channels/types";
import type { InfrastructureObject, ObjectRisk, ObjectRiskCounts } from "@/modules/objects/types";
import type { Prediction, RiskLevel } from "@/modules/predictions/types";
import { channelsOf, mockChannels } from "../data/channels";
import { mockObjects } from "../data/objects";
import { getLivePredictions } from "../data/notifications";

/**
 * Серверный риск для моков `/objects?withRisk=true` и `/channels?withRisk=true`.
 *
 * Считаем из живого журнала (`getLivePredictions`), поэтому `spawnCriticalPrediction`
 * по SSE перекрашивает существующие узлы на следующем запросе — как на реальном бэке,
 * где риск производен от активных прогнозов, а фронт его только читает.
 *
 * Единицы счёта `riskCounts` подсмотрены в реальном ответе `/objects?withRisk=true`:
 * LOW/MEDIUM/HIGH — каналы с прогнозом соответствующего уровня, NONE — каналы без него;
 * `unreviewedPredictions` ≈ сумма ненулевых бакетов минус просмотренные. В моке те же
 * единицы: канал (уровень — сильнейший активный прогноз канала) и прогноз без `channelId`,
 * приписанный объекту напрямую.
 */

const RISK_RANK: Record<RiskLevel, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

function isActive(prediction: Prediction, now: number): boolean {
  return Date.parse(prediction.computedAt) <= now && now < Date.parse(prediction.horizonUntil);
}

/**
 * Риск каждого канала по всему реестру каналов: channelId → strongest.
 * Сильнейший, а не последний: узел красится худшим из активных прогнозов канала.
 * Id каналов с `objectId: null` в карту не попадают — их некому приписать.
 */
export function computeChannelRisks(): Map<string, ChannelRisk> {
  const now = Date.now();
  const strongest = new Map<string, Prediction>();

  for (const prediction of getLivePredictions()) {
    const channelId = prediction.context.channelId;
    if (!channelId || !isActive(prediction, now)) continue;

    const current = strongest.get(channelId);
    if (!current || RISK_RANK[prediction.riskLevel] > RISK_RANK[current.riskLevel]) {
      strongest.set(channelId, prediction);
    }
  }

  const risks = new Map<string, ChannelRisk>();
  for (const channel of mockChannels) {
    const prediction = strongest.get(channel.id);
    if (!prediction) continue;
    risks.set(channel.id, {
      riskLevel: prediction.riskLevel,
      probability: prediction.probability,
      predictionId: prediction.id,
      status: prediction.status,
    });
  }
  return risks;
}

/** Страница `/channels?withRisk=true`: `risk: null` — штатный ответ «прогнозов нет». */
export function withChannelRisk(channels: Channel[], risks: Map<string, ChannelRisk>): Channel[] {
  return channels.map((channel) => ({ ...channel, risk: risks.get(channel.id) ?? null }));
}

function emptyCounts(): ObjectRiskCounts {
  return { LOW: 0, MEDIUM: 0, HIGH: 0, NONE: 0 };
}

function levelOf(counts: ObjectRiskCounts): RiskLevel | null {
  if (counts.HIGH > 0) return "HIGH";
  if (counts.MEDIUM > 0) return "MEDIUM";
  if (counts.LOW > 0) return "LOW";
  return null;
}

/**
 * Риск каждого объекта реестра: свои единицы (только у уровня 3) плюс свёртка поддерева.
 * Обход с `visited` — реестр мока содержит цикл 92 ↔ 93, и наивный DFS по детям
 * завис бы на нём насмерть.
 */
export function computeObjectRisks(): Map<string, ObjectRisk> {
  const now = Date.now();
  const channelRisks = computeChannelRisks();

  const own = new Map<string, ObjectRiskCounts>();
  const directUnreviewed = new Map<string, number>();

  for (const object of mockObjects) {
    if (own.has(object.id)) continue;

    const counts = emptyCounts();
    for (const channel of channelsOf(object.id)) {
      const risk = channelRisks.get(channel.id);
      counts[risk ? risk.riskLevel : "NONE"] += 1;
    }
    own.set(object.id, counts);
  }

  for (const prediction of getLivePredictions()) {
    const objectId = prediction.context.objectId;
    if (!objectId || !isActive(prediction, now)) continue;

    const counts = own.get(objectId);
    if (counts) {
      // Прогноз без канала — своя единица счёта у объекта; с каналом уже учтён в бакете канала.
      if (!prediction.context.channelId) counts[prediction.riskLevel] += 1;
    }
    if (prediction.status === "NEW") directUnreviewed.set(objectId, (directUnreviewed.get(objectId) ?? 0) + 1);
  }

  // Дети по «первая запись выигрывает» — то же правило дедупа, что в buildObjectTree.
  const children = new Map<string, string[]>();
  for (const object of mockObjects) {
    if (!object.parentId) continue;
    const list = children.get(object.parentId);
    if (list) list.push(object.id);
    else children.set(object.parentId, [object.id]);
  }

  const totals = new Map<string, ObjectRisk>();

  function rollUp(id: string, visited: Set<string>): { counts: ObjectRiskCounts; unreviewed: number } {
    const counts = { ...(own.get(id) ?? emptyCounts()) };
    let pending = directUnreviewed.get(id) ?? 0;

    for (const childId of children.get(id) ?? []) {
      if (visited.has(childId)) continue;
      visited.add(childId);
      const child = rollUp(childId, visited);
      counts.LOW += child.counts.LOW;
      counts.MEDIUM += child.counts.MEDIUM;
      counts.HIGH += child.counts.HIGH;
      counts.NONE += child.counts.NONE;
      pending += child.unreviewed;
    }

    if (!totals.has(id)) {
      totals.set(id, { riskLevel: levelOf(counts), riskCounts: counts, unreviewedPredictions: pending });
    }
    return { counts, unreviewed: pending };
  }

  for (const object of mockObjects) {
    if (totals.has(object.id)) continue;
    rollUp(object.id, new Set([object.id]));
  }

  return totals;
}

/** Выдача `/objects?withRisk=true`: риск приходит на каждой записи, включая уровень 1 и 2. */
export function withObjectRisk(
  objects: InfrastructureObject[],
  risks: Map<string, ObjectRisk>,
): InfrastructureObject[] {
  return objects.map((object) => ({ ...object, risk: risks.get(object.id) ?? null }));
}
