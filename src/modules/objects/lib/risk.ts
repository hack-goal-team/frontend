import type { Channel } from "@/modules/channels/types";
import type { InfrastructureObject, NodeRisk } from "../types";

/**
 * Риск теперь серверный: `/objects?withRisk=true` несёт свёртку по поддереву,
 * `/channels?withRisk=true` — риск канала прямо в странице. Сканом
 * `/predictions?activeOnly=true` ничего не выводится, поэтому свёртки (`rollUpRisks`),
 * полноты (`coverage`) и «неатрибутированных прогнозов» здесь больше нет —
 * фронту остаётся только переложить контракт в форму отрисовки.
 */

/**
 * Риск объекта. Поля `risk` нет (запрос без `withRisk`, устаревший кэш) — знания нет:
 * прочерк, а не ○. `riskLevel: null` при присутствующем объекте — серверское
 * утверждение «активных прогнозов нет»: ○.
 */
export function objectRiskOf(object: InfrastructureObject): NodeRisk | null {
  if (object.risk === undefined || object.risk === null) return null;
  return { level: object.risk.riskLevel };
}

/**
 * Риск канала. В отличие от объекта `risk: null` — штатный ответ сервиса
 * («прогнозов нет», ○), поэтому он даёт уровень null, а не прочерк; прочерк —
 * только у отсутствующего поля.
 */
export function channelRiskOf(channel: Channel): NodeRisk | null {
  if (channel.risk === undefined) return null;
  return { level: channel.risk?.riskLevel ?? null };
}

/**
 * Прогноз для перехода по клику на карточке канала; null — клика не будет. Инцидент важнее:
 * канал только с отказом «к проверке» тоже кликабелен и открывает прогноз отказа.
 */
export function channelPredictionOf(channel: Channel): string | null {
  if (channel.risk) return channel.risk.predictionId;
  return channel.equipmentRisk?.riskLevel === "HIGH" ? channel.equipmentRisk.predictionId : null;
}

/** Значок 🔧 на узле: действующий прогноз отказа с уровнем HIGH («к проверке»). */
export function channelNeedsCheck(channel: Channel): boolean {
  return channel.equipmentRisk?.riskLevel === "HIGH";
}
