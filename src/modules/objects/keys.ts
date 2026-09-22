import type { ObjectsQuery } from "./types";

/**
 * Ключи Vue Query реестра. Список — ОДИН на всё приложение (см. useObjectRegistry):
 * level/risk/q — клиентские проекции одного массива, и ключ, зависящий от них, породил бы
 * три копии одного снапшота и рассинхрон «шапка графа ↔ список».
 */
export const objectsKeys = {
  all: ["objects"] as const,
  lists: () => [...objectsKeys.all, "list"] as const,
  list: (query: ObjectsQuery) => [...objectsKeys.lists(), query] as const,
  /** Производный риск из активных прогнозов — единственное, что инвалидируется по SSE. */
  riskMap: () => [...objectsKeys.all, "risk-map"] as const,
};
