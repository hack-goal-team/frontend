<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { Prediction, PredictionKind } from "@/modules/predictions/types";
import { INCIDENT_ICON } from "@/modules/predictions/consts";
import { useLabels } from "@/modules/reference/composables/useLabels";
import EquipmentCheckTag from "./EquipmentCheckTag.vue";
import RiskTag from "./RiskTag.vue";
import SensorStateTag from "./SensorStateTag.vue";
import StatusTag from "./StatusTag.vue";

defineProps<{
  kind: PredictionKind;
  items: Prediction[];
  loading?: boolean;
}>();

const { incidentTypeLabel } = useLabels();

const emit = defineEmits<{
  rowClick: [id: string];
}>();

function handleRowClick(row: Prediction) {
  emit("rowClick", row.id);
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="items"
    stripe
    height="100%"
    style="width: 100%"
    :border="true"
    empty-text="Загрузка..."
    highlight-current-row
    show-overflow-tooltip
    @row-click="handleRowClick"
  >
    <!-- Класс — то, что предсказала модель (incidentType), а не класс датчика из context. -->
    <el-table-column label="Класс" min-width="220">
      <template #default="{ row }">
        <span v-if="INCIDENT_ICON[row.incidentType]" class="incident-icon">{{ INCIDENT_ICON[row.incidentType] }}</span>
        {{ incidentTypeLabel(row.incidentType) }}
      </template>
    </el-table-column>
    <el-table-column label="Вероятность" min-width="120">
      <template #default="{ row }">
        {{ formatProbability(row.probability) }}
      </template>
    </el-table-column>
    <el-table-column label="Горизонт" min-width="150">
      <template #default="{ row }">
        {{ formatDateTime(row.horizonUntil) }}
      </template>
    </el-table-column>
    <el-table-column label="Объект" width="200">
      <template #default="{ row }">
        <span v-if="row.context?.objectName">
          {{ row.context.objectName }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
    </el-table-column>
    <el-table-column label="Датчик" width="230">
      <template #default="{ row }">
        <span v-if="row.context.sensorName">
          {{ row.context.sensorName }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
    </el-table-column>
    <el-table-column v-if="kind === 'INCIDENT'" key="risk" label="Риск" min-width="90">
      <template #default="{ row }">
        <RiskTag :level="row.riskLevel" />
      </template>
    </el-table-column>
    <el-table-column v-else key="check" label="Проверка" min-width="130">
      <template #default="{ row }">
        <EquipmentCheckTag :probability="row.probability" />
      </template>
    </el-table-column>
    <el-table-column label="Состояние" min-width="130">
      <template #default="{ row }">
        <SensorStateTag :state="row.currentState" />
      </template>
    </el-table-column>
    <el-table-column prop="status" label="Статус" min-width="260">
      <template #default="{ row }">
        <StatusTag :status="row.status" />
      </template>
    </el-table-column>
    <el-table-column label="Время" min-width="150">
      <template #default="{ row }">
        {{ formatDateTime(row.computedAt) }}
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.incident-icon {
  margin-right: 4px;
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
