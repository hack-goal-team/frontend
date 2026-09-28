<script setup lang="ts">
import { formatDateTime, formatHorizon } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { JournalKind, Prediction } from "@/modules/predictions/types";
import IncidentClassIcon from "@/modules/predictions/components/IncidentClassIcon.vue";
import IncidentClassTag from "@/modules/predictions/components/IncidentClassTag.vue";
import { SENSOR_AT_RISK } from "@/modules/predictions/consts";
import EquipmentCheckTag from "./EquipmentCheckTag.vue";
import RiskTag from "./RiskTag.vue";
import SensorStateTag from "./SensorStateTag.vue";
import StatusTag from "./StatusTag.vue";

// Набор колонок — по вкладке: у отказов нет ни уровня риска, ни класса прогноза (он один),
// зато виден класс канала — чтобы отказ датчика дыма не читался как «Пожар».
defineProps<{
  kind: JournalKind;
  items: Prediction[];
  loading?: boolean;
}>();

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
    <template v-if="kind === 'INCIDENT'">
      <!-- Класс — то, что предсказала модель (incidentType), а не класс датчика из context. -->
      <el-table-column key="class" label="Класс" min-width="160">
        <template #default="{ row }">
          <IncidentClassTag :code="row.incidentType" />
        </template>
      </el-table-column>
      <el-table-column key="risk" label="Риск" min-width="110">
        <template #default="{ row }">
          <RiskTag :level="row.riskLevel" />
        </template>
      </el-table-column>
    </template>
    <el-table-column v-else key="check" label="К проверке" min-width="130">
      <template #default="{ row }">
        <EquipmentCheckTag :level="row.riskLevel" />
      </template>
    </el-table-column>
    <el-table-column
      :key="`probability-${kind}`"
      :label="kind === 'INCIDENT' ? 'Вероятность' : 'Вероятность отказа'"
      :min-width="kind === 'INCIDENT' ? 120 : 160"
    >
      <template #default="{ row }">
        {{ formatProbability(row.probability) }}
      </template>
    </el-table-column>
    <el-table-column key="horizon" label="Горизонт" min-width="170">
      <template #default="{ row }">
        {{ formatHorizon(row.computedAt, row.horizonUntil).until }}
        <span class="text-muted">· {{ formatHorizon(row.computedAt, row.horizonUntil).span }}</span>
      </template>
    </el-table-column>
    <el-table-column key="object" label="Объект" width="200">
      <template #default="{ row }">
        <span v-if="row.context?.objectName">
          {{ row.context.objectName }}
        </span>
        <span v-else class="text-muted">—</span>
      </template>
    </el-table-column>
    <el-table-column key="sensor" label="Датчик" width="230">
      <template #default="{ row }">
        <span v-if="row.context.sensorName">
          {{ row.context.sensorName }}
        </span>
        <!-- У канала без имени в реестре датчик всё же есть — показываем хотя бы его тип. -->
        <span v-else class="text-muted">{{ row.context.sensorType ?? "—" }}</span>
        <!-- Отказ того же датчика «к проверке» — инцидент может оказаться ложным. -->
        <el-tooltip
          v-if="kind === 'INCIDENT' && row.equipmentRisk?.riskLevel === 'HIGH'"
          :content="SENSOR_AT_RISK"
          placement="top"
        >
          <span class="sensor-at-risk" :aria-label="SENSOR_AT_RISK"
            ><IncidentClassIcon code="EQUIPMENT_FAILURE"
          /></span>
        </el-tooltip>
      </template>
    </el-table-column>
    <el-table-column v-if="kind === 'EQUIPMENT'" key="channel-class" label="Класс канала" min-width="140">
      <template #default="{ row }">
        <span class="text-muted">{{ row.context?.incidentClass?.description ?? "—" }}</span>
      </template>
    </el-table-column>
    <el-table-column key="state" label="Состояние" min-width="130">
      <template #default="{ row }">
        <SensorStateTag :state="row.currentState" :incident-type="row.incidentType" />
      </template>
    </el-table-column>
    <el-table-column key="status" prop="status" label="Статус" min-width="260">
      <template #default="{ row }">
        <StatusTag :status="row.status" />
      </template>
    </el-table-column>
    <el-table-column key="computed" label="Вычислен" min-width="150">
      <template #default="{ row }">
        {{ formatDateTime(row.computedAt) }}
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.sensor-at-risk {
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
