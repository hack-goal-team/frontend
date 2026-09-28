import type { Prediction } from "@/modules/predictions/types";
import { formatHorizon } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import { pluralize } from "@/shared/lib/pluralize";

/**
 * «Появился 1 новый прогноз высокого риска» / «Появилось 5 новых прогнозов высокого риска»
 */
export function formatNewPredictions(count: number): string {
  if (count === 1) return "Появился 1 новый прогноз высокого риска";

  const noun = pluralize(count, "прогноз", "прогноза", "прогнозов");
  return `Появилось ${count} новых ${noun} высокого риска`;
}

/** «Подтопление · 94%» — класс и вероятность в заголовке тоста; процент — как в журнале. */
export function formatIncidentHeadline(label: string, probability: number): string {
  return `${label} · ${formatProbability(probability)}`;
}

/** «до 29.09 01:40 · Объект Дзета-6»; без объекта — «объект не определён». */
export function formatIncidentPlace(prediction: Prediction): string {
  const { until } = formatHorizon(prediction.computedAt, prediction.horizonUntil);
  return `${until} · ${prediction.context.objectName ?? "объект не определён"}`;
}

/** «Высокий риск: 5 инцидентов» — заголовок сводного тоста. */
export function formatIncidentsTotal(count: number): string {
  return `Высокий риск: ${count} ${pluralize(count, "инцидент", "инцидента", "инцидентов")}`;
}

/** «Подтопление 2 · Пожар 1» — по убыванию числа, порядок первого появления при равенстве. */
export function formatIncidentCounts(labels: string[]): string {
  const counts = new Map<string, number>();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([label, n]) => `${label} ${n}`)
    .join(" · ");
}
