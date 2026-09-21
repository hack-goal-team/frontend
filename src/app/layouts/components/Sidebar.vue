<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { useAuthStore } from "@/modules/auth/store";
import { PERMISSIONS } from "@/modules/auth/consts";
import { DataBoard, Warning, Document, Setting, List } from "@element-plus/icons-vue";
import type { Component } from "vue";
import logoLight from "@/app/layouts/components/assets/logo-light.png";
import logoDark from "@/app/layouts/components/assets/logo-dark.png";
import { isDark } from "@/shared/composables/useTheme";

const auth = useAuthStore();
const route = useRoute();

interface NavItem {
  name: string;
  path: string;
  label: string;
  icon: Component;
  permission: string | null; // null = без проверки
}

const ALL_ITEMS: NavItem[] = [
  {
    name: "dashboard",
    path: "/dashboard",
    label: "Аналитическая панель",
    icon: DataBoard,
    permission: PERMISSIONS.PREDICTION_READ,
  },
  {
    name: "predictions",
    path: "/predictions",
    label: "Журнал прогнозов",
    icon: Warning,
    permission: PERMISSIONS.PREDICTION_READ,
  },
  {
    name: "reports",
    path: "/reports",
    label: "Отчёты",
    icon: Document,
    permission: PERMISSIONS.REPORT_READ,
  },
  {
    name: "settings",
    path: "/settings",
    label: "Настройки",
    icon: Setting,
    permission: PERMISSIONS.SETTINGS_WRITE,
  },
  {
    name: "audit",
    path: "/audit",
    label: "Аудит",
    icon: List,
    permission: PERMISSIONS.AUDIT_READ,
  },
];

// Пункты, доступные пользователю по правам
const items = computed(() =>
  ALL_ITEMS.filter((item) => item.permission === null || auth.hasPermission(item.permission)),
);

const activePath = computed(() => route.path);

const logoUrl = computed(() => (isDark.value ? logoDark : logoLight));
</script>

<template>
  <div class="sidebar">
    <!-- Логотип -->
    <div class="sidebar__logo">
      <img :src="logoUrl" alt="Логотип" class="sidebar__logo-img" />
    </div>

    <!-- Навигация -->
    <nav class="sidebar__nav">
      <router-link
        v-for="item in items"
        :key="item.name"
        :to="item.path"
        class="sidebar__link"
        :class="{ 'is-active': activePath.startsWith(item.path) }"
      >
        <el-icon :size="18" class="sidebar__icon">
          <component :is="item.icon" />
        </el-icon>
        <span class="sidebar__label">{{ item.label }}</span>
      </router-link>
    </nav>

    <!-- Если ничего нет — пользователь без прав -->
    <div v-if="items.length === 0" class="sidebar__empty">Нет доступных разделов</div>
  </div>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 0;
  background: var(--el-bg-color);
}

/* Логотип */
.sidebar__logo {
  padding: 0 16px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  margin-bottom: 12px;
  display: flex;
  justify-content: center;
}

.sidebar__logo-img {
  max-width: 100%;
  object-fit: contain;
}

/* Навигация */
.sidebar__nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 8px;
  overflow-y: auto;
}

.sidebar__link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  color: var(--el-text-color-regular);
  text-decoration: none;
  font-size: 14px;
  transition:
    background 0.15s,
    color 0.15s;
  cursor: pointer;
}

.sidebar__link:hover {
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
}

.sidebar__link.is-active {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 500;
}

.sidebar__icon {
  flex-shrink: 0;
}

.sidebar__label {
  flex: 1;
  min-width: 0;
}

/* Пустой сайдбар */
.sidebar__empty {
  padding: 16px;
  text-align: center;
  color: var(--el-text-color-placeholder);
  font-size: 13px;
}
</style>
