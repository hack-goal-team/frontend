<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Bell, InfoFilled } from "@element-plus/icons-vue";
import { useNotificationsStore } from "../store";
import { RISK_LABEL, RISK_TAG_TYPE } from "@/modules/predictions/consts";
import { useLabels } from "@/modules/reference/composables/useLabels";
import type { Prediction } from "@/modules/predictions/types";
import { formatDateTime } from "@/shared/lib/date";
import { formatProbability } from "@/shared/lib/probability";

const store = useNotificationsStore();
const router = useRouter();
const { incidentTypeLabel } = useLabels();

const items = computed(() => store.recentNotifications);

function openPrediction(prediction: Prediction) {
  router.push({ name: "predictions", query: { selectedId: prediction.id, offset: "0" } });
}

function objectLabel(p: Prediction): string {
  return p.context.objectName ?? p.targetRef;
}

/**
 * Локация — из контекста цели. Мок и бэк отдают sensorName и sensorType
 * неразличимыми для части каналов, дубли вырезаем.
 */
function locationLabel(p: Prediction): string {
  const { sensorName, sensorType, engineeringSystem } = p.context;
  const parts = [...new Set([sensorName, sensorType, engineeringSystem].filter((v): v is string => !!v))];

  return parts.length > 0 ? parts.join(" · ") : "Локация неизвестна";
}
</script>

<template>
  <el-card shadow="never" class="recent-notifications">
    <template #header>
      <div class="recent-notifications__header">
        <span class="recent-notifications__title">
          Последние уведомления
          <el-tooltip placement="top" content="Уведомления текущей сессии. После перезагрузки страницы список пуст.">
            <el-icon class="recent-notifications__help"><InfoFilled /></el-icon>
          </el-tooltip>
        </span>

        <el-button v-if="items.length > 0" text size="small" @click="store.clearNotifications()"> Очистить </el-button>
      </div>
    </template>

    <div v-if="items.length === 0" class="recent-notifications__empty">
      <el-icon><Bell /></el-icon>
      <span>Новых уведомлений нет</span>
    </div>

    <div v-else class="recent-notifications__list">
      <div
        v-for="item in items"
        :key="item.id"
        class="notification"
        role="button"
        tabindex="0"
        @click="openPrediction(item.prediction)"
        @keydown.enter="openPrediction(item.prediction)"
      >
        <div class="notification__header">
          <el-tag :type="RISK_TAG_TYPE[item.prediction.riskLevel]" size="small">
            {{ RISK_LABEL[item.prediction.riskLevel] }}
          </el-tag>
          <span class="notification__type">{{ incidentTypeLabel(item.prediction.incidentType) }}</span>
          <span class="notification__time">{{ formatDateTime(item.receivedAt) }}</span>
        </div>

        <div class="notification__object">{{ objectLabel(item.prediction) }}</div>

        <div class="notification__location">{{ locationLabel(item.prediction) }}</div>

        <div class="notification__metrics">
          <span>
            Вероятность
            <strong>{{ formatProbability(item.prediction.probability) }}</strong>
          </span>
          <span>
            Горизонт до
            <strong>{{ formatDateTime(item.prediction.horizonUntil) }}</strong>
          </span>
          <span class="notification__link">Открыть прогноз →</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.recent-notifications :deep(.el-card__header) {
  padding: 12px 16px;
}

.recent-notifications__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.recent-notifications__title {
  display: flex;
  align-items: center;
  gap: 6px;
}

.recent-notifications__help {
  color: var(--el-text-color-secondary);
}

.recent-notifications__list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
}

.recent-notifications__empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}

.notification {
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
}

.notification:hover {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.notification__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.notification__type {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.notification__time {
  margin-left: auto;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  font-variant-numeric: tabular-nums;
}

.notification__object {
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin-bottom: 2px;
}

.notification__location {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.notification__metrics {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.notification__metrics strong {
  color: var(--el-text-color-primary);
  font-variant-numeric: tabular-nums;
}

.notification__link {
  margin-left: auto;
  color: var(--el-color-primary);
}
</style>
