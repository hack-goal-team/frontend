<script setup lang="ts">
import { computed } from "vue";
import IncidentClassIcon from "@/modules/predictions/components/IncidentClassIcon.vue";
import { needsEquipmentCheck } from "@/modules/predictions/lib/equipmentCheck";
import type { RiskLevel } from "@/modules/predictions/types";
import { useReferenceStore } from "@/modules/reference/store";
import { formatProbability } from "@/shared/lib/probability";

// Только для прогнозов вида EQUIPMENT: там riskLevel двоичный, и HIGH означает «к проверке».
const props = defineProps<{
  level: RiskLevel;
}>();

const reference = useReferenceStore();

// Порог — только для пояснения: решение «к проверке» уже принял бэк.
const hint = computed(() => {
  const threshold = reference.equipmentCheckThreshold;
  return threshold === null
    ? "Модель отказов: вероятность отказа датчика выше порога проверки. Это не инцидент"
    : `Вероятность отказа ≥ ${formatProbability(threshold)} — модель отказов. Это не инцидент`;
});
</script>

<template>
  <el-tooltip v-if="needsEquipmentCheck(props.level)" :content="hint" placement="top">
    <span class="equipment-check">
      <IncidentClassIcon code="EQUIPMENT_FAILURE" class="equipment-check__icon" />
      К проверке
    </span>
  </el-tooltip>
  <span v-else class="text-muted">—</span>
</template>

<style scoped>
/* Как у класса: без рамки, иконка и подпись — одинаковые по высоте строки таблицы. */
.equipment-check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.equipment-check__icon {
  width: 16px;
  height: 16px;
  color: var(--el-text-color-secondary);
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
