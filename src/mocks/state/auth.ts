import type { CurrentUser } from "@/modules/auth/types";

/**
 * Текущий залогиненный пользователь в моке.
 * Модульная переменная — живёт, пока открыта вкладка.
 * В реальном бэке — spring-session-jdbc, cookie HttpOnly.
 */
let currentUser: CurrentUser | null = null;

export function getCurrentUser(): CurrentUser | null {
  return currentUser;
}

export function setCurrentUser(user: CurrentUser | null): void {
  currentUser = user;
}
