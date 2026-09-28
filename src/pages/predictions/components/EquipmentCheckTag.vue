<script setup lang="ts">
import { computed } from "vue";
import { needsEquipmentCheck } from "@/modules/predictions/lib/equipmentCheck";
import { useReferenceStore } from "@/modules/reference/store";

// Только для прогнозов вида EQUIPMENT: вероятность инцидентной модели с этим порогом не сравнима.
const props = defineProps<{
  probability: number;
}>();

const reference = useReferenceStore();

// Нейтральный цвет намеренно: это плановая проверка, а не срочный инцидент.
const check = computed(() => needsEquipmentCheck(props.probability, reference.equipmentCheckThreshold));
</script>

<template>
  <el-tag v-if="check" type="info">🔧 К проверке</el-tag>
  <span v-else class="text-muted">—</span>
</template>

<style scoped>
.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
