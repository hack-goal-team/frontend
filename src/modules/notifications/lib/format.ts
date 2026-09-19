import { pluralize } from "@/shared/lib/pluralize";

/**
 * «Появился 1 новый критический прогноз» / «Появилось 5 новых критических прогнозов»
 */
export function formatNewPredictions(count: number): string {
  if (count === 1) return "Появился 1 новый критический прогноз";

  const noun = pluralize(count, "прогноз", "прогноза", "прогнозов");
  return `Появилось ${count} новых критических ${noun}`;
}
