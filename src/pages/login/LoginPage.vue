<script setup lang="ts">
import { useAuthStore } from "@/modules/auth/store";
import { computed, reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();

const form = reactive({
  username: "",
  password: "",
});

const isMockMode = import.meta.env.VITE_USE_MOCK === "true";

const canSubmit = computed(() => form.username.trim().length > 0 && form.password.length > 0);

/**
 * Путь из ?redirect= берём только внутренний: `//host` браузер прочитает как
 * protocol-relative и уведёт за пределы приложения.
 */
function redirectPath(redirect: unknown): string {
  if (typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")) {
    return redirect;
  }
  return "/dashboard";
}

async function onSubmit() {
  if (!canSubmit.value || auth.loading) return;

  try {
    await auth.login(form.username, form.password);
    router.push(redirectPath(route.query.redirect));
  } catch {
    // ошибка уже в auth.error
  }
}

function fillDemo(user: string) {
  form.username = user;
  form.password = user;
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

    <template v-if="isMockMode" #footer>
      <div class="login-card__demo">
        <div class="login-card__demo-title">Демо-доступ (мок):</div>
        <div class="login-card__demo-list">
          <el-button
            v-for="user in ['technician', 'district', 'global', 'head', 'admin', 'empty']"
            :key="user"
            text
            size="small"
            @click="fillDemo(user)"
          >
            {{ user }}
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
