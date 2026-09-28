/**
 * «К проверке» — вероятность отказа не ниже фиксированного порога бэка. Уровней риска у модели
 * отказов нет, поэтому RiskTag здесь не годится; без справочника порог неизвестен — null.
 */
export function needsEquipmentCheck(probability: number, threshold: number | null): boolean | null {
  if (threshold === null) return null;
  return probability >= threshold;
}
