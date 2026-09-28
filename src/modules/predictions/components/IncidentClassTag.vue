<script setup lang="ts">
import { useLabels } from "@/modules/reference/composables/useLabels";
import IncidentClassIcon from "./IncidentClassIcon.vue";

// Нейтральный тег: красный/жёлтый/зелёный заняты уровнем риска, классом их не трогаем.
defineProps<{ code: string }>();

const { incidentTypeLabel } = useLabels();
</script>

<template>
  <el-tag type="info" effect="plain" class="incident-class-tag">
    <span class="incident-class-tag__content">
      <IncidentClassIcon :code="code" />
      {{ incidentTypeLabel(code) }}
    </span>
  </el-tag>
</template>

<style scoped>
.incident-class-tag__content {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
</style>
