import { useRouter } from "vue-router";
import { useQueryClient } from "@tanstack/vue-query";
import { ElMessage } from "element-plus";
// Программные El*-API не автоимпортируются вместе со стилями (см. AGENTS.md)
import "element-plus/theme-chalk/el-message.css";
import { useAuthStore } from "../store";

/**
 * Завершение сессии: сервер → кэш запросов → /login. Сервер может не ответить
 * (закрытая сеть, рестарт) — локально сессия всё равно гасится, иначе
 * пользователю не выйти из приложения.
 */
export function useLogout() {
  const auth = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout(): Promise<void> {
    try {
      await auth.logout();
    } catch {
      ElMessage.warning("Сессия закрыта локально. Сервер не ответил.");
    } finally {
      queryClient.clear();
      router.replace({ name: "login" });
    }
  }

  return { logout };
}
