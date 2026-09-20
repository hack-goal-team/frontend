<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <el-result icon="info" title="404" sub-title="Страница не найдена">
    <template #extra>
      <el-button type="primary" @click="router.push('/predictions')"> К прогнозам </el-button>
    </template>
  </el-result>
</template>
