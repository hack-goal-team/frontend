import { getWithHeaders } from "@/shared/api/http";
import { parseTotal } from "./lib/total";
import type { InfrastructureObject, ObjectRegistryPage, ObjectsQuery } from "./types";

/**
 * `GET /objects` отдаёт ГОЛЫЙ массив, поэтому возвращаем `{ items, total }` по образцу
 * `fetchPredictions` — иначе `X-Total-Count` теряется.
 *
 * Контракт v0 (docs/api-docs.json): параметры `level` и `withRisk`; с `withRisk=true`
 * каждый объект несёт серверный `risk` — свёртку поддерева по порогам из `/reference-data`.
 * Фронту её не пересчитывать и пороги не зашивать (AGENTS.md), поэтому скан
 * `/predictions?activeOnly=true` ради риска реестра больше не нужен.
 *
 * Про `total`: у `/objects` пагинации нет, так что `items.length` и есть истина.
 * Расхождение с заголовком разрешается в пользу `items.length` с предупреждением
 * (заголовок там — перестраховка контракта). `null` из `parseTotal` при этом остаётся
 * `null`: тихое превращение отсутствующего заголовка в 0 показало бы «Реестр пуст»
 * там, где мы просто не знаем числа.
 */
export async function fetchObjects(query: ObjectsQuery = {}): Promise<ObjectRegistryPage> {
  // `withRisk=false` на бэк не шлём: по контракту это и так значение по умолчанию,
  // а `?withRisk=false` в логах — шум.
  const { data, headers } = await getWithHeaders<InfrastructureObject[]>("/objects", {
    ...query,
    withRisk: query.withRisk || undefined,
  });
  const items = Array.isArray(data) ? data : [];
  const headerTotal = parseTotal(headers);

  if (headerTotal === null) return { items, total: items.length };
  if (headerTotal !== items.length) {
    console.warn(
      `[objects] X-Total-Count=${headerTotal} не совпал с числом записей в выдаче (${items.length}) — верим выдаче`,
    );
    return { items, total: items.length };
  }

  return { items, total: headerTotal };
}
