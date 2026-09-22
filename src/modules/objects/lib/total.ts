/**
 * X-Total-Count — три состояния, а не одно: «0», «число» и «заголовка нет».
 * `Number(headers["x-total-count"] ?? 0)` (как в predictions/api.ts) сливает первые два,
 * а на /channels это разные Вселенные: 0 → «Каналов нет», отсутствие → «Сколько каналов —
 * неизвестно». Здесь отсутствие, пустая строка и не-число дают null; 0 остаётся 0.
 */
export function parseTotal(headers: Record<string, string> | undefined): number | null {
  const raw = headers?.["x-total-count"] ?? headers?.["X-Total-Count"];
  if (raw === undefined || raw === null) return null;

  const text = String(raw).trim();
  if (text === "") return null;

  const value = Number(text);
  return Number.isFinite(value) && value >= 0 ? value : null;
}
