import type { CurrentUser } from "../types";
import { PERMISSIONS } from "../consts";
import { hasPermission } from "./hasPermission";

/**
 * Маршрут по умолчанию для залогиненного — по правам, не по ролям:
 * роли меняются, права стабильны. admin без PREDICTION_READ попадёт на
 * /settings, а не на /dashboard с 403. Незалогиненному — на вход.
 */
export function defaultRouteFor(user: Pick<CurrentUser, "permissions"> | null | undefined): string {
  if (!user) return "/login";
  if (hasPermission(user, PERMISSIONS.PREDICTION_READ)) return "/dashboard";
  if (hasPermission(user, PERMISSIONS.REPORT_READ)) return "/reports";
  if (hasPermission(user, PERMISSIONS.SETTINGS_WRITE)) return "/settings";
  if (hasPermission(user, PERMISSIONS.AUDIT_READ)) return "/audit";
  return "/403";
}

/** Подпись кнопки «домой» по тому же маршруту — одна правда в одном месте. */
export function defaultRouteLabel(user: Pick<CurrentUser, "permissions"> | null | undefined): string {
  const route = defaultRouteFor(user);
  if (route === "/dashboard") return "К прогнозам";
  if (route === "/settings") return "К настройкам";
  if (route === "/audit") return "К аудиту";
  if (route === "/reports") return "К отчётам";
  if (route === "/login") return "Войти";
  return "К доступному разделу";
}
