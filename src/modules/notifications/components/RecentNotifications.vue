<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Bell, InfoFilled } from "@element-plus/icons-vue";
import { useNotificationsStore } from "../store";
import { NO_OBJECT_HINT, SHOW_ON_GRAPH_SHORT } from "@/modules/objects/consts";
import IncidentClassIcon from "@/modules/predictions/components/IncidentClassIcon.vue";
import { formatIncidentHeadline, formatIncidentPlace } from "../lib/format";
import { useLabels } from "@/modules/reference/composables/useLabels";
import type { Prediction } from "@/modules/predictions/types";
import { formatDateTime } from "@/shared/lib/date";

const store = useNotificationsStore();
const router = useRouter();
const { incidentTypeLabel } = useLabels();

const items = computed(() => store.recentNotifications);
const criticalCount = computed(() => store.criticalCount);

/**
 * Лента — окно сессии, снимок SSE — актуальное состояние. Числа различаются,
 * и без пояснения диспетчер примет «20 записей» за «20 проблем».
 */
const hintText = computed(() => {
  const base = "Уведомления текущей сессии. После перезагрузки список пуст.";
  if (criticalCount.value === 0) return base;

  const active = `Активных высокого риска сейчас: ${criticalCount.value}`;
  if (items.value.length === 0) return `${base} ${active}.`;

  return `${base} ${active} — лента показывает только последние ${items.value.length}.`;
});

function openPrediction(prediction: Prediction) {
  router.push({ name: "predictions", query: { kind: "INCIDENT", selectedId: prediction.id, offset: "0" } });
}

/**
 * Прогноз привязан к объекту не всегда (ADR-003): без `context.objectId` перехода на граф
 * не существует, и кнопка обязана говорить об этом, а не вести в пустой экран.
 */
function hasObject(prediction: Prediction): boolean {
  return prediction.context?.objectId != null;
}

function openGraph(prediction: Prediction) {
  const { objectId, channelId } = prediction.context ?? {};
  if (!objectId) return;

  router.push({
    name: "object-graph",
    params: { id: objectId },
    query: channelId ? { highlightChannel: channelId } : {},
  });
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

          <span v-if="criticalCount > 0" class="recent-notifications__active">
            · активных высокого риска: {{ criticalCount }}
          </span>

          <el-tooltip placement="top" :content="hintText">
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
        <!-- Строка — в формате тоста: класс · вероятность, затем горизонт и объект. -->
        <div class="notification__header">
          <span class="notification__type">
            <IncidentClassIcon :code="item.prediction.incidentType" />
            {{ formatIncidentHeadline(incidentTypeLabel(item.prediction.incidentType), item.prediction.probability) }}
          </span>
          <span class="notification__time">{{ formatDateTime(item.receivedAt) }}</span>
        </div>

        <div class="notification__object">{{ formatIncidentPlace(item.prediction) }}</div>

        <div class="notification__location">{{ locationLabel(item.prediction) }}</div>

        <div class="notification__metrics">
          <span class="notification__actions">
            <!-- .stop на click и keydown.enter: клик по карточке наружу должен сохраниться -->
            <el-tooltip :content="NO_OBJECT_HINT" :disabled="hasObject(item.prediction)" placement="top">
              <!-- span-обёртка обязательна: disabled-button не шлёт pointer-events, и без неё
                   подсказка «почему недоступно» не показывается вообще -->
              <span>
                <el-button
                  size="small"
                  text
                  :disabled="!hasObject(item.prediction)"
                  @click.stop="openGraph(item.prediction)"
                  @keydown.enter.stop
                >
                  {{ SHOW_ON_GRAPH_SHORT }}
                </el-button>
              </span>
            </el-tooltip>
            <span class="notification__link">Открыть прогноз →</span>
          </span>
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

.recent-notifications__active {
  font-size: 13px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
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
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
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

.notification__actions {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.notification__link {
  color: var(--el-color-primary);
}
</style>
