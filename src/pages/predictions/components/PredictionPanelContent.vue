<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { PredictionDetail } from "@/modules/predictions/types";
import RiskTag from "./RiskTag.vue";
import StatusTag from "./StatusTag.vue";
import { useLabels } from "@/modules/reference/composables/useLabels.ts";

defineProps<{
  detail: PredictionDetail;
}>();

const { reasonLabel, incidentTypeLabel } = useLabels();
</script>

<template>
  <div class="prediction-panel">
    <!-- Прогноз -->
    <el-descriptions :column="1" border>
      <el-descriptions-item label="Тип инцидента">
        {{ incidentTypeLabel(detail.prediction.incidentType) }}
      </el-descriptions-item>

      <el-descriptions-item label="Вероятность">
        {{ formatProbability(detail.prediction.probability) }}
      </el-descriptions-item>

      <el-descriptions-item label="Риск">
        <RiskTag :level="detail.prediction.riskLevel" />
      </el-descriptions-item>

      <el-descriptions-item label="Статус">
        <StatusTag :status="detail.prediction.status" />
      </el-descriptions-item>

      <el-descriptions-item label="Объект">
        <span v-if="detail.prediction.context?.objectName">
          {{ detail.prediction.context.objectName }}
        </span>
        <span v-else class="text-muted">—</span>
      </el-descriptions-item>

      <el-descriptions-item label="Датчик">
        <span v-if="detail.prediction.context?.sensorName">
          {{ detail.prediction.context.sensorName }}
          <span v-if="detail.prediction.context.sensorType" class="text-muted">
            ({{ detail.prediction.context.sensorType }})
          </span>
        </span>
        <span v-else class="text-muted">—</span>
      </el-descriptions-item>

      <el-descriptions-item label="Подсистема">
        {{ detail.prediction.context?.engineeringSystem ?? "—" }}
      </el-descriptions-item>

      <el-descriptions-item label="Горизонт">
        {{ formatDateTime(detail.prediction.horizonUntil) }}
      </el-descriptions-item>

      <el-descriptions-item label="Вычислен">
        {{ formatDateTime(detail.prediction.computedAt) }}
      </el-descriptions-item>

      <el-descriptions-item label="Модель">
        <span class="text-muted">{{ detail.prediction.modelVersion }}</span>
      </el-descriptions-item>

      <el-descriptions-item label="Техническая цель">
        <span class="text-muted"> {{ detail.prediction.targetKind }} / {{ detail.prediction.targetRef }} </span>
      </el-descriptions-item>

      <el-descriptions-item label="Последнее решение">
        <span v-if="detail.prediction.lastDecision">
          {{ reasonLabel(detail.prediction.lastDecision.reasonCode) }}
          <span class="text-muted"> от {{ formatDateTime(detail.prediction.lastDecision.decidedAt) }} </span>
        </span>
        <span v-else class="text-muted">Нет</span>
      </el-descriptions-item>
    </el-descriptions>

    <!-- История решений -->
    <div class="prediction-panel__section">
      <h3 class="prediction-panel__section-title">История решений</h3>

      <el-empty v-if="detail.decisions.length === 0" description="Решений нет" :image-size="80" />

      <el-timeline v-else>
        <el-timeline-item
          v-for="d in detail.decisions"
          :key="d.id"
          :timestamp="formatDateTime(d.decidedAt)"
          placement="top"
        >
          <div class="prediction-panel__decision">
            <div>
              {{ reasonLabel(d.reasonCode) }}
            </div>
            <div v-if="d.comment" class="prediction-panel__decision-comment">
              {{ d.comment }}
            </div>
            <div class="prediction-panel__decision-author">
              {{ d.decidedBy }}
            </div>
          </div>
        </el-timeline-item>
      </el-timeline>
    </div>
  </div>
</template>

<style scoped>
.prediction-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.prediction-panel__section-title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.prediction-panel__decision {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prediction-panel__decision-reason {
  font-weight: 500;
}

.prediction-panel__decision-comment {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.prediction-panel__decision-author {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
