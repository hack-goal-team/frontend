import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { isAxiosError } from "axios";
import { authApi } from "./api";
import type { CurrentUser } from "./types";
import { hasPermission as hasPermissionFn } from "./lib/hasPermission";
import { type Permission } from "./consts";

export const useAuthStore = defineStore("auth", () => {
  const user = ref<CurrentUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => user.value !== null);

  // --- права ---
  function hasPermission(permission: Permission | string): boolean {
    return hasPermissionFn(user.value, permission);
  }

  // --- область видимости ---
  const scope = computed(() => user.value?.scope ?? null);
  const scopeKind = computed(() => scope.value?.kind ?? null);
  const scopeObjectIds = computed(() => scope.value?.objectIds ?? []);
  const isEmptyScope = computed(() => scopeKind.value === "EMPTY");
  const isAllScope = computed(() => scopeKind.value === "ALL");

  // --- логин ---
  async function login(username: string, password: string): Promise<void> {
    loading.value = true;
    error.value = null;

    const payload = {
      username: username.trim(),
      password, // как есть
    };

    try {
      user.value = await authApi.login(payload);
    } catch (e: unknown) {
      if (isAxiosError(e)) {
        const status = e.response?.status;
        if (status === 401) {
          error.value = "Неверный логин или пароль";
        } else if (status === 403) {
          // Пароль верный, но нет группы роли
          error.value = "Учётной записи не выдана роль. Обратитесь к администратору.";
        } else if (status === 503) {
          error.value = "Сервис аутентификации недоступен";
        } else {
          error.value = "Ошибка входа";
        }
      } else {
        error.value = "Ошибка входа";
      }
      throw e;
    } finally {
      loading.value = false;
    }
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } finally {
      reset();
    }
  }

  async function fetchMe(): Promise<void> {
    try {
      user.value = await authApi.me();
    } catch (e: unknown) {
      if (isAxiosError(e) && e.response?.status === 401) {
        user.value = null;
        return;
      }
      console.warn("[auth] fetchMe failed", e);
      user.value = null;
    }
  }

  function reset(): void {
    user.value = null;
    loading.value = false;
    error.value = null;
  }

  return {
    user,
    loading,
    error,
    isAuthenticated,
    hasPermission,
    scope,
    scopeKind,
    scopeObjectIds,
    isEmptyScope,
    isAllScope,
    login,
    logout,
    fetchMe,
    reset,
  };
});
