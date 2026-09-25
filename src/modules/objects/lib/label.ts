import { NAME_FALLBACK_PREFIX, OBJECT_KIND_LABEL } from "../consts";
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

/** Вторая строка подписи узла: вид объекта; числа каналов в контракте v0 нет. */
export function objectSublabel(object: InfrastructureObject | ObjectTreeNode): string {
  const source = "object" in object ? object.object : object;
  return OBJECT_KIND_LABEL[source.kind] ?? source.kind;
}
