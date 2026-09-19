import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);

export function formatDateTime(iso: string): string {
  return dayjs.utc(iso).local().format("DD.MM.YYYY HH:mm");
}
