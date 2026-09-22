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
          meta: { public: true },
        },
      ],
    },
    // --- Страница 403: для авторизованного, но без нужного права ---
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
      children: [
        { path: "", redirect: "/dashboard" },
        {
          path: "predictions",
          name: "predictions",
          component: () => import("@/pages/predictions/PredictionsPage.vue"),
          meta: { permission: PERMISSIONS.PREDICTION_READ },
        },
        {
          path: "dashboard",
          name: "dashboard",
          component: () => import("@/pages/dashboard/DashboardPage.vue"),
          meta: { permission: PERMISSIONS.PREDICTION_READ },
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
  // Защита по умолчанию: публичный маршрут только тот, что помечен `public`.
  // Так неизвестный путь и 404 тоже уводят на /login, а не показываются без сессии.
  const isPublic = to.meta.public === true;

  // 1. Восстановить сессию, если нужно
  if (!auth.user && !isPublic) {
    await auth.fetchMe();
  }

  // 2. Не авторизован → /login
  if (!isPublic && !auth.isAuthenticated) {
    return { name: "login", query: { redirect: to.fullPath } };
  }

  // 3. Уже авторизован → не пускать на /login
  if (to.name === "login" && auth.isAuthenticated) {
    return { name: "dashboard" };
  }

  // 4. Проверка прав
  const required = to.meta.permission as string | undefined;
  if (required && !auth.hasPermission(required)) {
    return { name: "forbidden" };
  }

  // 5. Справочник до рендера: подписи кодов и пороги риска нужны первому кадру,
  //    иначе страница на миг показывает FLOOD вместо «Подтопление». Ошибку load
  //    глотает сам стор — навигация из-за недоступного справочника не встанет.
  if (!isPublic) {
    await useReferenceStore().load();
  }
});
