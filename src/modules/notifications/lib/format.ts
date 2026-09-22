import { pluralize } from "@/shared/lib/pluralize";

/**
 * «Появился 1 новый прогноз высокого риска» / «Появилось 5 новых прогнозов высокого риска»
 */
export function formatNewPredictions(count: number): string {
  if (count === 1) return "Появился 1 новый прогноз высокого риска";

  const noun = pluralize(count, "прогноз", "прогноза", "прогнозов");
  return `Появилось ${count} новых ${noun} высокого риска`;
}
