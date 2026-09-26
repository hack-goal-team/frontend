export function formatProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/** Вклад фактора прогноза: знаковое процентное пункта; значения меньше 10% — до сотых. */
export function formatContribution(value: number): string {
  const pct = value * 100;
  const digits = Math.abs(pct) >= 10 ? 0 : 2;
  const formatted = Math.abs(pct).toLocaleString("ru-RU", { maximumFractionDigits: digits });
  const sign = value < 0 ? "−" : "+";
  return `${sign}${formatted}%`;
}
