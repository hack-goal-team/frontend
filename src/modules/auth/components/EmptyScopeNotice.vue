<script setup lang="ts">
import { Warning } from "@element-plus/icons-vue";
</script>

<template>
  <div class="empty-scope-notice">
    <el-icon :size="64" color="var(--el-color-warning)">
      <Warning />
    </el-icon>
    <p class="empty-scope-notice__title">Область видимости не назначена</p>
    <p class="empty-scope-notice__hint">Обратитесь к администратору для назначения области.</p>
  </div>
</template>

<style scoped>
.empty-scope-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 32px;
  text-align: center;
  flex: 1;
}

.empty-scope-notice__title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.empty-scope-notice__hint {
  margin: 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}
</style>
