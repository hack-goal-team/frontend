<script setup lang="ts">
import { RouterView } from "vue-router";
import Header from "./components/Header.vue";
</script>

<template>
  <el-container class="app-layout">
    <el-container>
      <el-header>
        <Header />
      </el-header>

      <el-main class="app-main">
        <RouterView />
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.app-header {
  flex: 0 0 auto;
  padding: 0;
  border-bottom: 1px solid var(--el-border-color);
}
.app-main {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
