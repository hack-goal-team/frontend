<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();
</script>

<template>
  <el-result icon="warning" title="403" sub-title="Недостаточно прав">
    <template #extra>
      <el-button @click="router.back()">Назад</el-button>
      <el-button type="primary" @click="router.push('/predictions')"> К прогнозам </el-button>
    </template>
  </el-result>
</template>
