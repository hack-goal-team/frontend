import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/modules/auth/store";
import { useReferenceStore } from "@/modules/reference/store";
import { PERMISSIONS } from "@/modules/auth/consts";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    // --- Публичные страницы ---
    {
      path: "/login",
      component: () => import("@/app/layouts/AuthLayout.vue"),
      children: [
        {
          path: "",
          name: "login",
          component: () => import("@/pages/login/LoginPage.vue"),
        },
      ],
    },
    {
      path: "/403",
      component: () => import("@/app/layouts/AuthLayout.vue"),
      children: [
        {
          path: "",
          name: "forbidden",
          component: () => import("@/pages/errors/ForbiddenPage.vue"),
        },
      ],
    },

    // --- Защищённые страницы ---
    {
      path: "/",
      component: () => import("@/app/layouts/AppLayout.vue"),
      meta: { requiresAuth: true },
      children: [
        { path: "", redirect: "/predictions" },
        {
          path: "predictions",
          name: "predictions",
          component: () => import("@/pages/predictions/PredictionsPage.vue"),
          meta: { requiresAuth: true, permission: PERMISSIONS.PREDICTION_READ },
        },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/pages/dashboard/DashboardPage.vue"),
          meta: { requiresAuth: true, permission: PERMISSIONS.PREDICTION_READ },
        },
      ],
    },

    // --- 404 ---
    {
      path: "/:pathMatch(.*)*",
      component: () => import("@/app/layouts/AuthLayout.vue"),
      children: [
        {
          path: "",
          name: "not-found",
          component: () => import("@/pages/errors/NotFoundPage.vue"),
        },
      ],
    },
  ],
});

router.beforeEach(async (to) => {
  const auth = useAuthStore();

  // 1. Восстановить сессию, если нужно
  if (!auth.user && to.meta.requiresAuth) {
    await auth.fetchMe();
  }

  // 2. Не авторизован → /login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  // 3. Уже авторизован → не пускать на /login
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "predictions" };
  }

  // 4. Проверка прав
  const required = to.meta.permission as string | undefined;
  if (required && !auth.hasPermission(required)) {
    return { name: "forbidden" };
  }

  // 5. Справочник до рендера: подписи кодов и пороги риска нужны первому кадру,
  //    иначе страница на миг показывает FLOOD вместо «Подтопление». Ошибку load
  //    глотает сам стор — навигация из-за недоступного справочника не встанет.
  if (to.meta.requiresAuth) {
    await useReferenceStore().load();
  }
});
