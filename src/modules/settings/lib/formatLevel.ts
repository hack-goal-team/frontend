import { formatDateTime } from "@/shared/lib/date";
import type { RiverLevel } from "../types";

function decimal(value: number, digits: number): string {
  return value.toFixed(digits).replace(".", ",");
}

// Пост меряют раз в сутки, поэтому diffCm подписываем как изменение за сутки.
export function formatRiverLevel(level: RiverLevel): string {
  const parts: string[] = [];

  if (level.gaugeName) parts.push(level.gaugeName);
  if (level.levelAbsM != null) parts.push(`${decimal(level.levelAbsM, 2)} м`);
  if (level.diffCm != null) parts.push(`${level.diffCm > 0 ? "+" : ""}${decimal(level.diffCm, 1)} см за сутки`);
  if (level.measuredAt) parts.push(formatDateTime(level.measuredAt));

  return parts.join(" · ");
}
