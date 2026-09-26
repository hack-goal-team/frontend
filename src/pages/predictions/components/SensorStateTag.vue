<script setup lang="ts">
import type { SensorState } from "@/modules/predictions/types";

// Приоритет: «уже горит» сильнее «данных нет» — тревога от свежего датчика важнее устаревшего показания.
defineProps<{
  state?: SensorState | null;
}>();
</script>

<template>
  <el-tag v-if="state?.alarming" type="danger">Уже горит</el-tag>
  <el-tag v-else-if="state?.outdated" type="warning">Данные устарели</el-tag>
  <el-tag v-else-if="state" type="info">{{ state.value || "Прогноз" }}</el-tag>
  <span v-else class="text-muted">—</span>
</template>

<style scoped>
.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
