<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";
import type { PredictionDetail } from "@/modules/predictions/types";
import { RISK_TAG_TYPE, STATUS_TAG_TYPE } from "@/modules/predictions/consts";

defineProps<{
  detail: PredictionDetail;
}>();
</script>

<template>
  <div class="prediction-panel">
    <!-- Прогноз -->
    <el-descriptions :column="1" border>
      <el-descriptions-item label="Тип инцидента">
        {{ detail.prediction.incidentType }}
      </el-descriptions-item>

      <el-descriptions-item label="Вероятность">
        {{ formatProbability(detail.prediction.probability) }}
      </el-descriptions-item>

      <el-descriptions-item label="Риск">
        <el-tag :type="RISK_TAG_TYPE[detail.prediction.riskLevel]">
          {{ detail.prediction.riskLevel }}
        </el-tag>
      </el-descriptions-item>

      <el-descriptions-item label="Статус">
        <el-tag :type="STATUS_TAG_TYPE[detail.prediction.status]">
          {{ detail.prediction.status }}
        </el-tag>
      </el-descriptions-item>

      <el-descriptions-item label="Цель">
        {{ detail.prediction.targetKind }} / {{ detail.prediction.targetRef }}
      </el-descriptions-item>

      <el-descriptions-item label="Горизонт">
        {{ formatDateTime(detail.prediction.horizonUntil) }}
      </el-descriptions-item>

      <el-descriptions-item label="Вычислен">
        {{ formatDateTime(detail.prediction.computedAt) }}
      </el-descriptions-item>

      <el-descriptions-item label="Модель">
        {{ detail.prediction.modelVersion }}
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
              <strong>{{ d.actionCode ?? "Без действия" }}</strong>
              · {{ d.reasonCode }}
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

.prediction-panel__decision-comment {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.prediction-panel__decision-author {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
</style>
