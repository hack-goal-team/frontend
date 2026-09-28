<script setup lang="ts">
import type { SensorState } from "@/modules/predictions/types";

// Бейдж повторяет фильтр «Состояние» и контракт параметра `alarming`: решает только
// currentState.alarming, outdated не учитывается. «Уже горит» — только у пожара: для
// подтопления или проникновения так не говорят, там нейтральное «Тревога».
defineProps<{
  state?: SensorState | null;
  incidentType?: string;
}>();
</script>

<template>
  <el-tag v-if="state" :type="state.alarming ? 'danger' : 'success'">
    {{ state.alarming ? (incidentType === "FIRE" ? "Уже горит" : "Тревога") : "В норме" }}
  </el-tag>
  <span v-else class="text-muted">—</span>
</template>

<style scoped>
.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
