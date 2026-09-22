import type { Channel, ChannelsPage } from "../types";

export interface MergedChannels {
  items: Channel[];
  /** null — X-Total-Count не приходил ни на одной странице: «сколько каналов — неизвестно». */
  total: number | null;
  /** Берётся у ПОСЛЕДНЕЙ страницы: именно она говорит, есть ли продолжение. */
  hasMore: boolean;
  /** Сколько записей отсекалось дедупом — масштаб того, что страницы пересеклись. */
  duplicates: number;
}

const EMPTY: MergedChannels = { items: [], total: null, hasMore: false, duplicates: 0 };

/**
 * Склейка накопленных страниц `useInfiniteQuery` в один список.
 *
 * Дедуп по `id` обязателен: `/channels` не обещает `ORDER BY`, offset-пагинация без
 * стабильного порядка перекрывает страницы, а дубликат id на графе — это два узла Vue Flow
 * с одним ключом, то есть поломка отрисовки. Выигрывает первая встреча.
 *
 * ПОРЯДОК остаётся «как пришло», и это НЕ утверждение о трассе: позиция узла = индекс
 * в конкатенации страниц. Если бэк не гарантирует физический порядок выдачи каналов,
 * граф — перечень, а не контур, и соседство узлов ничего не утверждает; в UI то же
 * говорит `RELATIONS_HINT`. Сортировки по риску здесь сознательно нет — она закодировала
 * бы ложное «проблемный канал идёт следующим по трассе».
 */
export function mergeChannelPages(pages: ChannelsPage[] | undefined): MergedChannels {
  if (!pages?.length) return EMPTY;

  const byId = new Map<string, Channel>();
  let duplicates = 0;
  let total: number | null = null;

  for (const page of pages) {
    for (const channel of page?.items ?? []) {
      if (!channel?.id) continue;
      if (byId.has(channel.id)) {
        duplicates += 1;
        continue;
      }
      byId.set(channel.id, channel);
    }
    // Счётчик одного запроса не должен меняться от страницы к странице; берём первый не-null.
    if (total === null) total = page?.total ?? null;
  }

  const last = pages[pages.length - 1];

  return { items: [...byId.values()], total, hasMore: last?.hasMore === true, duplicates };
}
