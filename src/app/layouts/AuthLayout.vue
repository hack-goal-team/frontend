<script setup lang="ts">
import { RouterView } from "vue-router";
</script>

<template>
  <div class="auth-layout">
    <RouterView />
  </div>
</template>

<style scoped>
.auth-layout {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-bg-color-page);
  padding: 24px;
}

html:not(.dark) .auth-layout {
  background: #ededed;
}
</style>
