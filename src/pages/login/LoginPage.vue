<script setup lang="ts">
import { useAuthStore } from "@/modules/auth/store";
import { defaultRouteFor } from "@/modules/auth/lib/defaultRoute";
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = reactive({
  username: "",
  password: "",
});

const canSubmit = computed(() => form.username.trim().length > 0 && form.password.length > 0);

/**
 * Путь из ?redirect= берём только внутренний: `//host` браузер прочитает как
 * protocol-relative и уведёт за пределы приложения. Без валидного redirect —
 * маршрут по правам, а не хардкод: admin уедет на /settings, а не на 403.
 */
function safeRedirect(redirect: unknown): string | null {
  if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return null;
}

async function onSubmit() {
  if (!canSubmit.value || auth.loading) return;

  try {
    await auth.login(form.username, form.password);
    router.push(safeRedirect(route.query.redirect) ?? defaultRouteFor(auth.user));
  } catch {
    // ошибка уже в auth.error
  }
}

const demoUsers = [
  { username: "technician", password: import.meta.env.VITE_DEMO_TECHNICIAN_PASSWORD, label: "Technician" },
  { username: "dispatcher", password: import.meta.env.VITE_DEMO_DISPATCHER_PASSWORD, label: "Dispatcher" },
  { username: "cds", password: import.meta.env.VITE_DEMO_CDS_PASSWORD, label: "CDS" },
  { username: "head", password: import.meta.env.VITE_DEMO_HEAD_PASSWORD, label: "Head" },
];

function fillDemo(user: { username: string; password: string }) {
  form.username = user.username;
  form.password = user.password;
}
</script>

<template>
  <el-card class="login-card">
    <template #header>
      <h2 class="login-card__title">Авторизация (LDAP/AD)</h2>
    </template>

    <el-form :model="form" label-position="top" @submit.prevent="onSubmit">
      <el-form-item label="Логин">
        <el-input
          v-model="form.username"
          name="username"
          autocomplete="username"
          autocapitalize="off"
          autocorrect="off"
          spellcheck="false"
          :disabled="auth.loading"
        />
      </el-form-item>

      <el-form-item label="Пароль">
        <el-input
          v-model="form.password"
          name="password"
          type="password"
          autocomplete="current-password"
          show-password
          :disabled="auth.loading"
        />
      </el-form-item>

      <el-alert
        v-if="auth.error"
        :title="auth.error"
        type="error"
        :closable="false"
        show-icon
        class="login-card__error"
      />

      <el-button
        type="primary"
        native-type="submit"
        :loading="auth.loading"
        :disabled="!canSubmit"
        class="login-card__submit"
      >
        Войти
      </el-button>
    </el-form>

    <template #footer>
      <div class="login-card__demo">
        <div class="login-card__demo-title">Демо-доступ:</div>
        <div class="login-card__demo-list">
          <el-button v-for="user in demoUsers" :key="user.username" text size="small" @click="fillDemo(user)">
            {{ user.label }}
          </el-button>
        </div>
      </div>
    </template>
  </el-card>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 400px;
}

.login-card__title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  text-align: center;
}

.login-card__error {
  margin-bottom: 16px;
}

.login-card__submit {
  width: 100%;
}

.login-card__footer {
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.login-card__footer code {
  background: var(--el-fill-color-light);
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 4px;
}

.login-card__demo {
  display: flex;
  flex-direction: column;
  gap: 8px;
  text-align: center;
}

.login-card__demo-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.login-card__demo-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  justify-content: center;
}
</style>
