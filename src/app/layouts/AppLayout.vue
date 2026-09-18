<script setup lang="ts">
import { RouterView } from "vue-router";
import Header from "./components/Header.vue";
import { useSse } from "@/modules/notifications/useSse";
// import Sidebar from "./components/Sidebar.vue";

useSse();
</script>

<template>
  <el-container class="app-layout">
    <!-- <el-aside width="240px" class="app-aside">
      <Sidebar />
    </el-aside> -->

    <el-container class="app-body">
      <el-header class="app-header">
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
  height: 100vh;
  background: var(--el-bg-color-page);
}

.app-aside {
  border-right: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  overflow-y: auto;
}

.app-header {
  padding: 14px;
  border-bottom: 1px solid var(--el-border-color);
}

.app-main {
  overflow-y: auto;
  background: var(--el-bg-color-page);
}

html:not(.dark) .app-main {
  background: #ededed;
}
</style>
