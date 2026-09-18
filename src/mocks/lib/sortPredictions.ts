import type { Prediction } from "@/modules/predictions/types";

/**
 * Сортировка по контракту: computedAt DESC, id DESC.
 * Возвращает НОВЫЙ массив, не мутирует исходный.
 */
export function sortPredictions(items: Prediction[]): Prediction[] {
  return [...items].sort((a, b) => {
    if (a.computedAt !== b.computedAt) {
      return a.computedAt < b.computedAt ? 1 : -1;
    }
    return a.id < b.id ? 1 : -1;
  });
}
