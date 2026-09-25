<script setup lang="ts">
withDefaults(
  defineProps<{
    cards?: number;
    notificationItems?: number;
    animated?: boolean;
    throttle?: number | { leading?: number; trailing?: number; initVal?: boolean };
  }>(),
  {
    cards: 4,
    notificationItems: 5,
    animated: true,
    throttle: 200,
  },
);

const RISK_LEVELS = 3;
</script>

<template>
  <el-skeleton class="dashboard-skeleton" :animated="animated" :throttle="throttle">
    <template #template>
      <!-- Мета: последний расчёт и сводка -->
      <div class="dashboard-skeleton__meta">
        <el-skeleton-item variant="text" class="dashboard-skeleton__meta-line" style="width: 320px" />
        <el-skeleton-item variant="text" class="dashboard-skeleton__meta-line" style="width: 230px" />
      </div>

      <!-- Сетка карточек-счётчиков -->
      <div class="dashboard-skeleton__grid">
        <div v-for="i in cards" :key="`card-${i}`" class="dashboard-skeleton__card">
          <el-skeleton-item variant="rect" class="dashboard-skeleton__icon" />
          <div class="dashboard-skeleton__card-content">
            <el-skeleton-item variant="text" class="dashboard-skeleton__card-title" style="width: 50%" />
            <el-skeleton-item variant="text" class="dashboard-skeleton__card-value" style="width: 64px" />
            <el-skeleton-item variant="text" class="dashboard-skeleton__card-hint" style="width: 90%" />
            <el-skeleton-item variant="text" class="dashboard-skeleton__card-hint" style="width: 90%" />
          </div>
        </div>
      </div>

      <el-skeleton-item variant="text" class="dashboard-skeleton__caption" style="width: 70%" />

      <!-- Карточка распределения по уровню риска -->
      <div class="dashboard-skeleton__risks">
        <div class="dashboard-skeleton__card-header">
          <el-skeleton-item variant="text" style="width: 220px; height: 18px" />
        </div>

        <div class="dashboard-skeleton__risks-body">
          <div v-for="i in RISK_LEVELS" :key="`risk-${i}`" class="dashboard-skeleton__risk-row">
            <el-skeleton-item variant="rect" class="dashboard-skeleton__tag" />
            <el-skeleton-item variant="rect" class="dashboard-skeleton__bar" />
            <el-skeleton-item variant="text" class="dashboard-skeleton__count" style="width: 36px" />
          </div>
        </div>
      </div>

      <!-- Последние уведомления -->
      <div class="dashboard-skeleton__notifications">
        <div class="dashboard-skeleton__card-header">
          <el-skeleton-item variant="text" style="width: 180px; height: 18px" />
        </div>

        <div class="dashboard-skeleton__notifications-body">
          <div v-for="i in notificationItems" :key="`notification-${i}`" class="dashboard-skeleton__notification">
            <div class="dashboard-skeleton__notification-header">
              <el-skeleton-item variant="rect" class="dashboard-skeleton__tag" />
              <el-skeleton-item variant="text" style="width: 22%; height: 13px" />
            </div>
            <el-skeleton-item variant="text" class="dashboard-skeleton__notification-object" style="width: 45%" />
            <el-skeleton-item variant="text" style="width: 55%; height: 12px" />
            <el-skeleton-item variant="text" style="width: 65%; height: 13px; padding-top: 5px" />
          </div>
        </div>
      </div>
    </template>
  </el-skeleton>
</template>

<style scoped>
.dashboard-skeleton {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

.dashboard-skeleton__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  min-height: 20px;
}

.dashboard-skeleton__meta-line {
  height: 13px;
}

.dashboard-skeleton__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  flex-shrink: 0;
}

.dashboard-skeleton__card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  min-height: 132px;
}

.dashboard-skeleton__icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
}

.dashboard-skeleton__card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dashboard-skeleton__card-title {
  height: 13px;
}

.dashboard-skeleton__card-value {
  height: 28px;
}

.dashboard-skeleton__card-hint {
  height: 12px;
}

.dashboard-skeleton__caption {
  height: 17px;
}

.dashboard-skeleton__risks,
.dashboard-skeleton__notifications {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
}

.dashboard-skeleton__risks {
  flex-shrink: 0;
}

.dashboard-skeleton__notifications {
  /* Карточка сжимается последней: скролл уходит в body, а не на страницу */
  flex: 0 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.dashboard-skeleton__card-header {
  padding: 16px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.dashboard-skeleton__risks-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dashboard-skeleton__risk-row {
  display: grid;
  grid-template-columns: 100px 1fr 60px;
  align-items: center;
  gap: 12px;
}

.dashboard-skeleton__tag {
  width: 60px;
  height: 24px;
  border-radius: 4px;
}

.dashboard-skeleton__bar {
  height: 20px;
  border-radius: 10px;
}

.dashboard-skeleton__count {
  height: 14px;
  justify-self: end;
}

.dashboard-skeleton__notifications-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.dashboard-skeleton__notification {
  padding: 12px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 127px;
}

.dashboard-skeleton__notification-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.dashboard-skeleton__notification-object {
  height: 14px;
}
</style>
