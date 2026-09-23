<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/modules/auth/store";
import { useLogout } from "@/modules/auth/composables/useLogout";
import { defaultRouteFor, defaultRouteLabel } from "@/modules/auth/lib/defaultRoute";

const router = useRouter();
const auth = useAuthStore();
const { logout } = useLogout();

const homeRoute = computed(() => defaultRouteFor(auth.user));
const homeLabel = computed(() => defaultRouteLabel(auth.user));

// Пользователь без единого права: homeRoute указывает на /403.
// Кнопка «На главную» увела бы на ту же страницу — показываем «Выйти».
const isLockedOut = computed(() => homeRoute.value === "/403");

// Кнопка «Назад» имеет смысл, только если есть куда возвращаться.
// window.history.length не реактивен, но за время жизни страницы не меняется.
const canGoBack = window.history.length > 1;

// Из контракта: повторный вход не поможет — роль выдаёт администратор каталога,
// поэтому ведём не на форму входа, а на объяснение.
const description = computed(() => {
  if (isLockedOut.value) {
    return "Учётной записи не выдано ни одной роли с доступом. Обратитесь к администратору каталога.";
  }
  return "У вашей роли нет прав на эту страницу. Повторный вход не поможет — права выдаёт администратор.";
});

function goHome() {
  router.push(homeRoute.value);
}

function goBack() {
  router.back();
}
</script>

<template>
  <el-result icon="warning" title="403" sub-title="Недостаточно прав">
    <template #extra>
      <p class="forbidden-page__description">{{ description }}</p>

      <div class="forbidden-page__actions">
        <el-button v-if="canGoBack" @click="goBack">Назад</el-button>

        <el-button v-if="!isLockedOut" type="primary" @click="goHome"> {{ homeLabel }} </el-button>

        <el-button v-else type="danger" @click="logout"> Выйти </el-button>
      </div>
    </template>
  </el-result>
</template>

<style scoped>
.forbidden-page__description {
  margin: 0 0 16px;
  max-width: 480px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.forbidden-page__actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
