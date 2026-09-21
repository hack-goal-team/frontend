<template>
  <div class="prediction-skeleton">
    <!-- Заголовок / основной блок -->
    <el-skeleton animated :throttle="200">
      <template #template>
        <div class="prediction-skeleton__section">
          <el-skeleton-item variant="text" style="width: 40%; height: 20px" />
        </div>

        <!-- Описания — 6 строк -->
        <div class="prediction-skeleton__section">
          <div v-for="i in 6" :key="i" class="prediction-skeleton__row">
            <el-skeleton-item variant="text" style="width: 30%; height: 14px" />
            <el-skeleton-item variant="text" style="width: 60%; height: 14px" />
          </div>
        </div>

        <!-- Заголовок истории -->
        <div class="prediction-skeleton__section">
          <el-skeleton-item variant="text" style="width: 30%; height: 18px" />
        </div>

        <!-- Таймлайн — 3 элемента -->
        <div class="prediction-skeleton__section">
          <div v-for="i in 3" :key="i" class="prediction-skeleton__timeline-item">
            <el-skeleton-item variant="circle" style="width: 12px; height: 12px" />
            <div class="prediction-skeleton__timeline-body">
              <el-skeleton-item variant="text" style="width: 40%; height: 14px" />
              <el-skeleton-item variant="text" style="width: 80%; height: 14px" />
            </div>
          </div>
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.prediction-skeleton {
  padding: 8px 0;
}

.prediction-skeleton__section {
  margin-bottom: 24px;
}

.prediction-skeleton__row {
  display: flex;
  gap: 16px;
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.prediction-skeleton__row:last-child {
  border-bottom: none;
}

.prediction-skeleton__timeline-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.prediction-skeleton__timeline-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
