import { getWithHeaders } from "@/shared/api/http";
// `parseTotal` — чистая функция из домена `objects`; второй копии в channels не заводим.
import { parseTotal } from "@/modules/objects/lib/total";
import { CHANNEL_PAGE_SIZE } from "@/modules/objects/consts";
import type { ChannelPage, ChannelsPage, ChannelsQuery } from "./types";

/**
 * `GET /channels?objectId=&limit=&offset=` → страница + `X-Total-Count`.
 *
 * `total` — через `parseTotal`, а не `Number(... ?? 0)`: на этом ресурсе «заголовка нет»
 * и «там нуль» означают разное («сколько каналов — неизвестно» против «каналов нет»),
 * и молча слить их — значит показать «Каналов нет» там, где мы просто не знаем.
 *
 * Поля страницы в схеме не все `required` (`ChannelPage` = `Page` + `items`), поэтому
 * на каждый ответ — приводация к тому, что обещано, а `items ?? []` обязателен: `.filter`
 * на undefined уронил бы и реестр, и граф.
 */
export async function fetchChannels(query: ChannelsQuery): Promise<ChannelsPage> {
  const { data, headers } = await getWithHeaders<Partial<ChannelPage>>("/channels", query);
  const page = data ?? {};

  return {
    items: Array.isArray(page.items) ? page.items : [],
    limit: typeof page.limit === "number" ? page.limit : (query.limit ?? CHANNEL_PAGE_SIZE),
    offset: typeof page.offset === "number" ? page.offset : (query.offset ?? 0),
    hasMore: page.hasMore === true,
    total: parseTotal(headers),
  };
}
