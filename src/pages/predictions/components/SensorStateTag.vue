<script setup lang="ts">
import type { SensorState } from "@/modules/predictions/types";

// Бейдж повторяет фильтр «Состояние» и контракт параметра `alarming`: решает только
// currentState.alarming, outdated не учитывается. Без currentState — прочерк.
defineProps<{
  state?: SensorState | null;
}>();
</script>

<template>
  <el-tag v-if="state" :type="state.alarming ? 'danger' : 'success'">
    {{ state.alarming ? "Уже горит" : "В норме" }}
  </el-tag>
  <span v-else class="text-muted">—</span>
</template>

<style scoped>
.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
