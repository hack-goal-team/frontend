<script setup lang="ts">
import { computed } from "vue";
import StreamStatus from "@/modules/notifications/components/StreamStatus.vue";
import CriticalIndicator from "@/modules/notifications/components/CriticalIndicator.vue";
import AlarmingIndicator from "@/modules/predictions/components/AlarmingIndicator.vue";
import { isDark, toggleDark } from "@/shared/composables/useTheme";
import { Moon, Sunny } from "@element-plus/icons-vue";
import ScopeBadge from "@/modules/auth/components/ScopeBadge.vue";
import UserMenu from "@/modules/auth/components/UserMenu.vue";
import { useAuthStore } from "@/modules/auth/store";
import { PERMISSIONS } from "@/modules/auth/consts";

const auth = useAuthStore();

/**
 * Центр шапки целиком про прогнозы: scope описывает, чьи объекты видно в них, счётчики
 * берутся из /predictions, статус — из SSE. Без PREDICTION_READ и там и там 403,
 * поэтому блоку тут не место (admin).
 */
const canReadPredictions = computed(() => auth.hasPermission(PERMISSIONS.PREDICTION_READ));
</script>

<template>
  <div class="header">
    <div class="header__left">
      <div id="header-left" class="header__slot" />
    </div>

    <div class="header__center">
      <template v-if="canReadPredictions">
        <ScopeBadge />
        <StreamStatus />
        <CriticalIndicator />
        <AlarmingIndicator />
      </template>
      <div id="header-center" class="header__slot" />
    </div>

    <div class="header__right">
      <el-button text circle :title="isDark ? 'Светлая тема' : 'Тёмная тема'" @click="toggleDark()">
        <el-icon :size="18">
          <Sunny v-if="isDark" />
          <Moon v-else />
        </el-icon>
      </el-button>
      <UserMenu />
      <div id="header-right" class="header__slot" />
    </div>
  </div>
</template>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 100%;
  padding: 0 16px;
  gap: 16px;
}

.header__left,
.header__center,
.header__right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header__left {
  flex: 1;
  min-width: 0;
}
.header__center {
  flex: 0 0 auto;
}
.header__right {
  flex: 0 0 auto;
}
</style>
