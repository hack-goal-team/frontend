import type { CurrentUser } from "@/modules/auth/types";
import type { Prediction } from "../types";

export function filterByScope(items: Prediction[], user: Pick<CurrentUser, "scope"> | null | undefined): Prediction[] {
  if (!user) return [];

  const scope = user.scope;

  if (scope.kind === "ALL") return items;
  if (scope.kind === "EMPTY") return [];

  // objectIds — number[], context.objectId — string | null.
  // Приводим к строке для сравнения.
  const allowed = new Set(scope.objectIds.map(String));

  return items.filter((p) => {
    const objectId = p.context?.objectId;
    if (!objectId) return false;
    return allowed.has(objectId);
  });
}
