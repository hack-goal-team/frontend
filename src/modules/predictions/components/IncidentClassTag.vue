<script setup lang="ts">
import { useLabels } from "@/modules/reference/composables/useLabels";
import IncidentClassIcon from "./IncidentClassIcon.vue";

// Без рамки: цветная иконка и подпись. Цвета классов — вне красного/жёлтого/зелёного,
// те заняты уровнем риска; отказ — нейтральный серый, он несрочный.
defineProps<{ code: string }>();

const { incidentTypeLabel } = useLabels();
</script>

<template>
  <span class="incident-class-tag" :class="`incident-class-tag_${code.toLowerCase()}`">
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

.incident-class-tag__icon {
  width: 16px;
  height: 16px;
  color: var(--incident-class-color, var(--el-text-color-secondary));
}

.incident-class-tag_fire {
  --incident-class-color: #f76707;
}

.incident-class-tag_flood {
  --incident-class-color: #1c7ed6;
}

.incident-class-tag_gas {
  --incident-class-color: #7048e8;
}

.incident-class-tag_intrusion {
  --incident-class-color: #0c8599;
}

.incident-class-tag_equipment_failure {
  --incident-class-color: var(--el-text-color-secondary);
}
</style>
