<script setup lang="ts">
import { useLabels } from "@/modules/reference/composables/useLabels";
import IncidentClassIcon from "./IncidentClassIcon.vue";

// Без рамки: цветная иконка и подпись. Цвета классов — вне красного/жёлтого/зелёного,
// те заняты уровнем риска; отказ — нейтральный серый, он несрочный.
defineProps<{ code: string }>();

const { incidentTypeLabel } = useLabels();
</script>

<template>
  <span class="incident-class-tag" :class="`incident-class_${code.toLowerCase()}`">
    <IncidentClassIcon :code="code" class="incident-class-tag__icon" />
    {{ incidentTypeLabel(code) }}
  </span>
</template>

<style scoped>
.incident-class-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-primary);
}

/* --incident-class-color задаёт маппинг кода класса в main.css. */
.incident-class-tag__icon {
  width: 16px;
  height: 16px;
  color: var(--incident-class-color, var(--el-text-color-secondary));
}
</style>
