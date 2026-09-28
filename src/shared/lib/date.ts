import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function formatDateTime(iso: string): string {
  return dayjs.utc(iso).local().format("DD.MM.YYYY HH:mm");
}

/**
 * Готовые периоды для `el-date-picker type="datetimerange"`: отсчитываются от «сейчас»,
 * поэтому пересчитываются при каждом открытии панели, а не замораживаются при загрузке.
 */
export const PERIOD_SHORTCUTS = [
  { text: "Сутки", value: () => [dayjs().subtract(1, "day").toDate(), new Date()] as [Date, Date] },
  { text: "Неделя", value: () => [dayjs().subtract(1, "week").toDate(), new Date()] as [Date, Date] },
];

/** Горизонт прогноза: «до 29.09 14:00» и длина окна от расчёта в целых часах — «24 ч». */
export function formatHorizon(computedAt: string, horizonUntil: string): { until: string; span: string } {
  const hours = Math.round(dayjs(horizonUntil).diff(dayjs(computedAt), "minute") / 60);
  return { until: `до ${dayjs.utc(horizonUntil).local().format("DD.MM HH:mm")}`, span: `${hours} ч` };
}
