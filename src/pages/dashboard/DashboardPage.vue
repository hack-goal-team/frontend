<script setup lang="ts">
import { computed } from "vue";
import { useDashboardQuery } from "@/modules/dashboard/composables/useDashboardQuery";
import { useAuthStore } from "@/modules/auth/store";
import { formatDateTime } from "@/shared/lib/date";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import DashboardCard from "./components/DashboardCard.vue";
import RiskBreakdown from "./components/RiskBreakdown.vue";

const auth = useAuthStore();
const { data, isLoading, isError, error } = useDashboardQuery();

const latestText = computed(() => {
  if (!data.value?.latestPredictionAt) return "Нет данных";
  return formatDateTime(data.value.latestPredictionAt);
});

const ageText = computed(() => {
  if (!data.value?.latestPredictionAt) return "—";
  const ms = Date.now() - Date.parse(data.value.latestPredictionAt);
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.floor(hours / 24);
  return `${days} дн назад`;
});
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Аналитическая панель</span>
  </Teleport>

  <div class="dashboard-page">
    <!-- EMPTY scope — объяснение -->
    <EmptyScopeNotice v-if="auth.isEmptyScope" />

    <!-- Ошибка -->
    <el-alert
      v-else-if="isError"
      type="error"
      :title="`Ошибка загрузки: ${(error as Error)?.message ?? 'неизвестно'}`"
      :closable="false"
      show-icon
    />

    <!-- Скелетон -->
    <el-skeleton v-else-if="isLoading" :rows="6" animated />

    <!-- Данные -->
    <template v-else-if="data">
      <!-- Верхний ряд: ключевые метрики -->
      <div class="dashboard-grid">
        <DashboardCard
          title="Активные прогнозы"
          :value="data.activePredictions"
          hint="Уникальные сочетания «цель + тип»"
          icon="Warning"
          color="warning"
        />

        <DashboardCard
          title="Строк журнала"
          :value="data.predictionRows"
          hint="Может быть больше активных при повторных расчётах"
          icon="Document"
          color="info"
        />

        <DashboardCard
          title="Без решения"
          :value="data.unreviewedPredictions"
          hint="Статус NEW — решение не зафиксировано"
          icon="Bell"
          color="danger"
        />
      </div>

      <!-- Разбивка по рискам -->
      <el-card shadow="never" class="dashboard-page__risks">
        <template #header>
          <div class="dashboard-page__risks-header">
            <span>Распределение по уровню риска</span>
            <span class="dashboard-page__updated">
              Данные обновлены: {{ latestText }}
              <span class="dashboard-page__age">({{ ageText }})</span>
            </span>
          </div>
        </template>

        <RiskBreakdown :counts="data.riskCounts" />
      </el-card>
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

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  flex-shrink: 0;
}

.dashboard-page__risks {
  flex: 1;
  min-height: 0;
}

.dashboard-page__risks-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.dashboard-page__updated {
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.dashboard-page__age {
  color: var(--el-text-color-placeholder);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
