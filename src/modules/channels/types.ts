import type { PredictionStatus, RiskLevel } from "@/modules/predictions/types";

/**
 * Типы канала — строго по реальному контракту v0 (схема `Channel`).
 * Домен отдельный от `objects`: у `/channels` своя пагинация и будущий
 * `/channels/{id}/measurements`, иначе objects свалкой станет.
 */

/** Риск канала из `/channels?withRisk=true`; `predictionId` — цель перехода по клику на узле. */
export interface ChannelRisk {
  riskLevel: RiskLevel;
  /** 0…1 — проценты считает фронт (AGENTS.md), здесь храним как в контракте. */
  probability: number;
  predictionId: string;
  status: PredictionStatus;
}

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
  /** Пикет в числовой форме; отсутствует, когда сервис его не знает. */
  piket?: number;
  /** Сырое строковое значение пикета (формат сервиса, без нормализации). */
  piketRaw?: string;
  pointId?: string;
  /**
   * Приходит только при `withRisk=true`. `null` — штатный ответ «активных прогнозов нет» (○),
   * отсутствие поля — «знания о риске нет» (прочерк): не путать.
   */
  risk?: ChannelRisk | null;
}

export interface ChannelsQuery {
  objectId?: string;
  withRisk?: boolean;
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
