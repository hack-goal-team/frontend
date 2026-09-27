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
