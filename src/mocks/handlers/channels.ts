import { http, HttpResponse } from "msw";
import { channelsOf, mockChannels } from "../data/channels";
import { OBJECT_CHANNELS_DOWN_ID } from "../data/objects";
import { computeChannelRisks, withChannelRisk } from "../lib/mockRisk";
import { scopeObjectIds } from "../lib/scopeObjects";
import { mockObjects } from "../data/objects";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100_000;

/**
 * `GET /channels?objectId=&limit=&offset=` — страница `ChannelPage` + `X-Total-Count`.
 *
 * 11 485 записей по описанию ручки мы не имитируем: фронту важнее не объём, а форма
 * ответа (нет `total` в теле, счётчик только заголовком, `hasMore` как единственный
 * признак продолжения). Объём задан точечно — объектами с 0, 12, 120 и 2 500 каналов
 * в `SPECIAL_CHANNEL_COUNTS` (`data/channels.ts`).
 *
 * Про права: в контракте у `/channels` есть только 400 и 401, ни 403, ни 404 (yaml:481-505).
 * Значит канал чужого объекта отдаётся ПУСТОЙ страницей, а не ошибкой: «нет доступа» и
 * «каналов нет» для фронта неразличимы, и придумывать здесь 403 значило бы проверять код,
 * который на настоящем сервисе не сработает. Вопрос «почему у `/objects` 403 есть, а тут нет»
 * — в списке для бэкенда.
 */
export const channelHandlers = [
  http.get(`${BASE}/channels`, async ({ request }) => {
    const user = getCurrentUser();

    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }

    const url = new URL(request.url);

    const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "") || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.min(Math.max(parseInt(url.searchParams.get("offset") ?? "") || 0, 0), MAX_OFFSET);
    const objectId = url.searchParams.get("objectId");

    // Отдельный объект, на котором реестр каналов «лежит»: единственный способ в браузере
    // увидеть служебный узел «Каналы не загрузились» и повтор запроса по клику.
    if (objectId === OBJECT_CHANNELS_DOWN_ID) {
      return problem(503, "Service Unavailable", "Channel registry is temporarily unavailable");
    }

    const inScope = objectId === null || scopeObjectIds(mockObjects, user).has(objectId);
    const items = objectId === null ? mockChannels : channelsOf(objectId);
    const visible = inScope ? items : [];

    const page = visible.slice(offset, offset + limit);

    // `withRisk=true` — риск каждой записи страницы: {…} или явный null («прогнозов нет»).
    // Без параметра поля `risk` в ответе нет — фронт читает прочерк, как на реальном бэке.
    const withRisk = url.searchParams.get("withRisk") === "true";
    const pageItems = withRisk ? withChannelRisk(page, computeChannelRisks()) : page;

    await mockDelay();

    return HttpResponse.json(
      {
        items: pageItems,
        limit,
        offset,
        hasMore: offset + limit < visible.length,
      },
      { headers: { "X-Total-Count": String(visible.length) } },
    );
  }),
];
