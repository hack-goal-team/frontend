import type { Prediction } from "@/modules/predictions/types";
import { sortPredictions } from "./sortPredictions";

/**
 * Последний расчёт на «цель + тип инцидента» — единица счёта сводки и `latestOnly` журнала:
 * одну цель модель считает несколько раз, наивный подсчёт строк показал бы лишние проблемы.
 */
export function latestByTarget(items: Prediction[]): Prediction[] {
  const latest = new Map<string, Prediction>();

  // sortPredictions — computedAt DESC, id DESC: первый в группе и есть последний расчёт
  for (const p of sortPredictions(items)) {
    const key = `${p.targetKind}|${p.targetRef}|${p.incidentType}`;
    if (!latest.has(key)) latest.set(key, p);
  }

  return [...latest.values()];
}
