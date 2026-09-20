import type { CurrentUser } from "../types";
import type { Permission } from "../consts";

export function hasPermission(
  user: Pick<CurrentUser, "permissions"> | null | undefined,
  permission: Permission | string,
): boolean {
  return user?.permissions.includes(permission) ?? false;
}
