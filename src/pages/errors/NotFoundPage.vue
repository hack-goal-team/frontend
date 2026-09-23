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
// Показывать «На главную» бессмысленно — ведёт на ту же страницу.
const isLockedOut = computed(() => homeRoute.value === "/403");

// Кнопка «Назад» имеет смысл, только если есть куда возвращаться.
// window.history.length не реактивен, но за время жизни страницы не меняется.
const canGoBack = window.history.length > 1;

function goHome() {
  router.push(homeRoute.value);
}

function goBack() {
  router.back();
}
</script>

<template>
  <el-result icon="info" title="404" sub-title="Страница не найдена">
    <template #extra>
      <el-button v-if="canGoBack" @click="goBack">Назад</el-button>

      <el-button v-if="!isLockedOut" type="primary" @click="goHome"> {{ homeLabel }} </el-button>

      <el-button v-else type="danger" @click="logout"> Выйти </el-button>
    </template>
  </el-result>
</template>
