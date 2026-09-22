<script setup lang="ts">
import { computed } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import { useDashboardQuery } from "@/modules/dashboard/composables/useDashboardQuery";
import { useAuthStore } from "@/modules/auth/store";
import { useRiskNavigation } from "@/modules/predictions/composables/useRiskNavigation";
import { useNow } from "@/shared/composables/useNow";
import { formatDateTime } from "@/shared/lib/date";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import RecentNotifications from "@/modules/notifications/components/RecentNotifications.vue";
import DashboardCard from "./components/DashboardCard.vue";
import RiskBreakdown from "./components/RiskBreakdown.vue";

type DashboardState = "empty-scope" | "loading" | "error" | "no-predictions" | "no-active" | "has-active";

const auth = useAuthStore();
const { openActive, openCritical, openUnreviewed } = useRiskNavigation();
const { data, isLoading, isError, error } = useDashboardQuery();

// Date.now() внутри computed не пересчитывается — возраст висел бы на первом рендере
const now = useNow(30_000);

const latestText = computed(() => {
  const iso = data.value?.latestPredictionAt;
  return iso ? formatDateTime(iso) : "нет данных";
});

const ageText = computed(() => {
  const iso = data.value?.latestPredictionAt;
  if (!iso) return "—";

  const ms = now.value.getTime() - Date.parse(iso);
  if (Number.isNaN(ms)) return "—";

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;

  return `${Math.floor(hours / 24)} дн назад`;
});

const generatedText = computed(() => {
  const iso = data.value?.generatedAt;
  return iso ? formatDateTime(iso) : "—";
});

/**
 * Отсутствие прогнозов не доказывает отсутствие проблем, поэтому «всё в норме»
 * тут не пишется: нет расчётов — «прогнозы не рассчитаны», расчёты были, но
 * истекли — «нет актуальных прогнозов» с временем последнего расчёта.
 */
const state = computed<DashboardState>(() => {
  if (auth.isEmptyScope) return "empty-scope";
  if (isLoading.value) return "loading";
  if (isError.value) return "error";
  if (!data.value?.latestPredictionAt) return "no-predictions";
  if (data.value.activePredictions === 0) return "no-active";
  return "has-active";
});
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Аналитическая панель</span>
  </Teleport>

  <div class="dashboard-page">
    <EmptyScopeNotice v-if="state === 'empty-scope'" />

    <el-alert
      v-else-if="state === 'error'"
      type="error"
      :title="`Ошибка загрузки: ${(error as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <el-skeleton v-else-if="state === 'loading'" :rows="6" animated />

    <el-empty v-else-if="state === 'no-predictions'" description="Прогнозы пока не рассчитаны" />

    <el-empty v-else-if="state === 'no-active'" description="Нет актуальных прогнозов на текущий момент">
      <p class="dashboard-page__empty-hint">Последний расчёт: {{ latestText }} · {{ ageText }}</p>
    </el-empty>

    <template v-else-if="data">
      <div class="dashboard-page__meta">
        <div class="dashboard-page__meta-item">
          <span class="dashboard-page__meta-label">Последний расчёт прогноза:</span>
          <span>{{ latestText }}</span>
          <span class="dashboard-page__age">· {{ ageText }}</span>
          <el-tooltip
            placement="top"
            content="Время последнего расчёта учитывает в том числе прогнозы, срок действия которых уже завершился."
          >
            <el-icon class="dashboard-page__help"><InfoFilled /></el-icon>
          </el-tooltip>
        </div>

        <div class="dashboard-page__meta-item">
          <span class="dashboard-page__meta-label">Сводка сформирована:</span>
          <span>{{ generatedText }}</span>
        </div>
      </div>

      <div class="dashboard-grid">
        <DashboardCard
          title="Активные риски"
          :value="data.activePredictions"
          hint="Все активные прогнозы, без повторов по «цель + тип инцидента»"
          icon="Warning"
          color="warning"
          clickable
          @click="openActive"
        />

        <DashboardCard
          title="Высокий риск"
          :value="data.riskCounts.HIGH"
          hint="Прогнозы с уровнем риска HIGH"
          icon="WarningFilled"
          color="danger"
          clickable
          @click="openCritical"
        />

        <DashboardCard
          title="Без решения"
          :value="data.unreviewedPredictions"
          hint="Статус NEW — решение не зафиксировано"
          icon="Bell"
          color="info"
          clickable
          @click="openUnreviewed"
        />
      </div>

      <div class="dashboard-page__caption">
        Активных строк журнала: {{ data.predictionRows }}. В счётчиках учитывается только последний актуальный прогноз
        по сочетанию «цель + тип инцидента».
        <el-tooltip
          placement="top"
          content="Одну цель модель считает несколько раз. В журнале строк может быть больше, чем показывает счётчик, — это не расхождение."
        >
          <el-icon class="dashboard-page__help"><InfoFilled /></el-icon>
        </el-tooltip>
      </div>

      <el-card shadow="never" class="dashboard-page__risks">
        <template #header>
          <span>Распределение по уровню риска</span>
        </template>

        <RiskBreakdown :counts="data.riskCounts" />
      </el-card>

      <RecentNotifications />
    </template>
  </div>
</template>

<style scoped>
.dashboard-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
}

.dashboard-page__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.dashboard-page__meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dashboard-page__meta-label {
  color: var(--el-text-color-secondary);
}

.dashboard-page__age {
  color: var(--el-text-color-placeholder);
}

.dashboard-page__help {
  color: var(--el-text-color-secondary);
}

.dashboard-page__caption {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.dashboard-page__empty-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  flex-shrink: 0;
}

.dashboard-page__risks {
  flex-shrink: 0;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
