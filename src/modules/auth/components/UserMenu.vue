<script setup lang="ts">
import { computed } from "vue";
import { ArrowDown, SwitchButton } from "@element-plus/icons-vue";
import { useAuthStore } from "../store";
import { useLogout } from "../composables/useLogout";

const auth = useAuthStore();
const { logout } = useLogout();

const displayName = computed(() => auth.user?.displayName ?? auth.user?.username ?? "Пользователь");

const initials = computed(() => {
  const name = displayName.value.trim();
  if (!name) return "?";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name[0].toUpperCase();
});

const rolesLabel = computed(() => {
  const roles = auth.user?.roles ?? [];
  return roles.join(", ");
});

// TODO: вынести в enum что бы был single source of truth
const avatarColor = computed(() => {
  const role = auth.user?.roles[0];
  switch (role) {
    case "ADMIN":
      return "var(--el-color-danger)";
    case "HEAD":
      return "var(--el-color-warning)";
    case "DISPATCHER_GLOBAL":
      return "var(--el-color-success)";
    case "DISPATCHER_DISTRICT":
      return "var(--el-color-primary)";
    case "TECHNICIAN":
      return "var(--el-color-info)";
    default:
      return "var(--el-color-primary)";
  }
});

function onCommand(command: string) {
  if (command === "logout") {
    logout();
  }
}
</script>

<template>
  <el-dropdown trigger="click" @command="onCommand">
    <div class="user-menu__trigger">
      <div class="user-menu__avatar" :style="{ background: avatarColor }">{{ initials }}</div>
      <el-icon class="user-menu__caret" :size="12">
        <ArrowDown />
      </el-icon>
    </div>

    <template #dropdown>
      <el-dropdown-menu>
        <div class="user-menu__header">
          <div class="user-menu__header-name">{{ displayName }}</div>
          <div v-if="rolesLabel" class="user-menu__header-roles">
            {{ rolesLabel }}
          </div>
        </div>

        <el-dropdown-item divided command="logout">
          <el-icon><SwitchButton /></el-icon>
          <span>Выйти</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.user-menu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 4px 2px 2px;
  border-radius: 16px;
  transition: background 0.2s;
  outline: none;
}

.user-menu__trigger:hover {
  background: var(--el-fill-color-light);
}

.user-menu__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--el-color-primary);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  user-select: none;
  flex-shrink: 0;
}

.user-menu__caret {
  color: var(--el-text-color-secondary);
}

.user-menu__header {
  padding: 8px 16px 4px;
  max-width: 220px;
}

.user-menu__header-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-menu__header-roles {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
