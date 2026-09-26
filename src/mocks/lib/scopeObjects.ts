import type { CurrentUser } from "@/modules/auth/types";
import type { InfrastructureObject } from "@/modules/objects/types";

/**
 * Область видимости реестра по ADR-028: «техник видит только своё поддерево».
 *
 * Ключевое слово — **поддерево**, то есть корень + потомки, но БЕЗ предков. Отсюда
 * следует поведение, которое легко принять за баг: под `technician` (scope `objectIds: [5]`,
 * объект уровня 3) в выдаче оказывается одна запись, она же осиротевший корень, а граф
 * рисуется без колонки предков. Это не потеря данных — у пользователя просто нет прав на
 * район и комплекс, стоящие выше.
 *
 * Риск реестра (`lib/mockRisk`) от области видимости НЕ зависит: бэк считает свёртку по всем
 * активным прогнозам, а права проверяет на ручке. Другое дело журнал: `filterByScope.ts`
 * сравнивает `context.objectId` со `scope.objectIds` точно, без раскрытия поддерева.
 * Практический эффект для демо: под `district` (корень 5773) реестр виден целиком и раскрашен,
 * а в `/predictions` на районе — пусто: предсказания привязаны к объектам уровня 3.
 */
export function scopeObjectIds(
  items: InfrastructureObject[],
  user: Pick<CurrentUser, "scope"> | null | undefined,
): Set<string> {
  const ids = new Set<string>();
  if (!user) return ids;
  if (user.scope.kind === "EMPTY") return ids;
  if (user.scope.kind === "ALL") {
    for (const item of items) ids.add(item.id);
    return ids;
  }

  const childrenByParent = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = childrenByParent.get(item.parentId);
    if (list) list.push(item.id);
    else childrenByParent.set(item.parentId, [item.id]);
  }

  const queue = [...user.scope.objectIds.map(String)];
  const seen = new Set<string>();

  while (queue.length > 0) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue; // защита от цикла в реестре: обход обязан завершиться
    seen.add(id);
    ids.add(id);
    for (const child of childrenByParent.get(id) ?? []) queue.push(child);
  }

  return ids;
}

export function filterObjectsByScope(
  items: InfrastructureObject[],
  user: Pick<CurrentUser, "scope"> | null | undefined,
): InfrastructureObject[] {
  if (!user) return [];
  // Порядок выдачи сохраняем: фронт строит дерево сам и сортирует его по подписи.
  const ids = scopeObjectIds(items, user);
  return items.filter((item) => ids.has(item.id));
}
