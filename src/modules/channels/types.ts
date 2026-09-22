/**
 * Типы канала — строго `docs/openapi-frontend.yaml` v0.2.0 (схема `Channel`).
 * Домен отдельный от `objects`: у `/channels` своя пагинация и будущий
 * `/channels/{id}/measurements`, иначе objects свалкой станет.
 */
export interface Channel {
  /** bigint строкой (AGENTS.md). */
  id: string;
  /** nullable: канал может не быть приписан к объекту. */
  objectId: string | null;
  sensorType: string;
  engineeringSystem: string;
  name: string | null;
  /** false — канал в потоке, но вне реестра (ADR-014): показывать, не терять. */
  known: boolean;
}

export interface ChannelsQuery {
  objectId?: string;
  /** 1…100 по контракту. */
  limit?: number;
  /** 0…100000. */
  offset?: number;
}

/** Ответ `/channels` — страница без `total`: счётчик приходит заголовком X-Total-Count. */
export interface ChannelPage {
  items: Channel[];
  limit: number;
  offset: number;
  hasMore: boolean;
}

/** Страница вместе со счётчиком: `total: null` — «заголовка нет», это НЕ ноль. */
export interface ChannelsPage extends ChannelPage {
  total: number | null;
}
