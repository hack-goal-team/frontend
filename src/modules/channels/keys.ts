/**
 * Ключи Vue Query каналов. `channels/types.ts` уже импортируется доменом `objects`
 * (`lib/graph.ts`), обратной зависимости «каналы → объекты» здесь нет и быть не должно.
 */
export const channelsKeys = {
  all: ["channels"] as const,
  lists: () => [...channelsKeys.all, "list"] as const,
  /**
   * Один ключ на объект: список каналов бесконечный (накопленные страницы), и зависеть
   * он должен только от `objectId`. Лимит отрисовки и подсветка — состояние экрана,
   * они в ключ не входят, иначе каждая догрузка обнуляла бы кэш.
   */
  byObject: (objectId: string) => [...channelsKeys.lists(), { objectId }] as const,
};
