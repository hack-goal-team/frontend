import { formatDateTime } from "@/shared/lib/date";
import { pluralize } from "@/shared/lib/pluralize";
import type { OdsPullResult, RegistryPullResult, WeatherPullResult } from "../types";

function count(n: number, one: string, few: string, many: string): string {
  return `${n} ${pluralize(n, one, few, many)}`;
}

function withMeta(summary: string, startedAt: string, durationMs: number): string {
  const seconds = (durationMs / 1000).toFixed(1).replace(".", ",");
  return `${summary} · ${formatDateTime(startedAt)} · ${seconds} с`;
}

export function formatWeatherResult(result: WeatherPullResult): string {
  return withMeta(
    [
      count(result.districts, "район", "района", "районов"),
      count(result.rowsWritten, "строка", "строки", "строк"),
      count(result.gaps, "пропуск", "пропуска", "пропусков"),
    ].join(", "),
    result.startedAt,
    result.durationMs,
  );
}

function changedLabel(changed: boolean): string {
  return changed ? "изменён" : "не изменён";
}

export function formatRegistryResult(result: RegistryPullResult): string {
  return withMeta(
    [
      `${count(result.channels.fetched, "канал", "канала", "каналов")} (${changedLabel(result.channels.changed)})`,
      `${count(result.objects.fetched, "объект", "объекта", "объектов")} (${changedLabel(result.objects.changed)})`,
    ].join(", "),
    result.startedAt,
    result.durationMs,
  );
}

export function formatOdsResult(result: OdsPullResult): string {
  return withMeta(
    [
      count(result.fetched, "заявка", "заявки", "заявок"),
      count(result.pages, "страница", "страницы", "страниц"),
      `вне справочника: ${result.unknown}`,
    ].join(", "),
    result.startedAt,
    result.durationMs,
  );
}
