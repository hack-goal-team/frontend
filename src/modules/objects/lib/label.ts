import { NAME_FALLBACK_PREFIX, OBJECT_KIND_LABEL, UNKNOWN_VALUE } from "../consts";
import type { InfrastructureObject, ObjectTreeNode } from "../types";

/**
 * Имя объекта или фолбэк «Объект #<id>». Пустой строки не возвращает никогда:
 * `name: null` в выдаче есть, а пустой подписи допускать нельзя ни в селекте,
 * ни в узле графа, ни в заголовке сортировки.
 */
export function objectLabel(object: Pick<InfrastructureObject, "id" | "name"> | null | undefined): string {
  if (!object) return "";
  const name = object.name?.trim();
  return name ? name : `${NAME_FALLBACK_PREFIX}${object.id}`;
}

/**
 * Вторая строка подписи: вид, уровень, число каналов.
 * `channelCount` отсутствует или null → «каналов: —», а не «0»: отсутствие поля
 * ничего не утверждает о числе каналов (см. § 5 плана).
 */
export function objectSublabel(object: InfrastructureObject | ObjectTreeNode): string {
  const source = "object" in object ? object.object : object;
  const channels =
    source.channelCount === undefined || source.channelCount === null ? UNKNOWN_VALUE : String(source.channelCount);

  const kind = OBJECT_KIND_LABEL[source.kind] ?? source.kind;
  return `${kind} · каналов: ${channels}`;
}
