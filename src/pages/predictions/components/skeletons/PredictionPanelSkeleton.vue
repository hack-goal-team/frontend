<script setup lang="ts">
withDefaults(
  defineProps<{
    descriptionRows?: number;
    timelineItems?: number;
    animated?: boolean;
    throttle?: number | { leading?: number; trailing?: number; initVal?: boolean };
  }>(),
  {
    descriptionRows: 11,
    timelineItems: 2,
    animated: true,
    throttle: 200,
  },
);

const WIDTHS = ["40%", "25%", "30%", "35%", "50%", "60%", "45%", "40%", "35%", "30%"];

function rowContentWidth(i: number): string {
  return WIDTHS[(i - 1) % WIDTHS.length];
}
</script>

<template>
  <el-skeleton :animated="animated" :throttle="throttle">
    <template #template>
      <div class="prediction-skeleton">
        <!-- ── 1. el-descriptions — 12 строк ── -->
        <div class="prediction-skeleton__descriptions">
          <div v-for="i in descriptionRows" :key="`row-${i}`" class="prediction-skeleton__row">
            <div class="prediction-skeleton__label">
              <el-skeleton-item variant="text" class="prediction-skeleton__label-text" />
            </div>
            <div class="prediction-skeleton__content">
              <el-skeleton-item variant="text" :style="{ width: rowContentWidth(i) }" />
            </div>
          </div>
        </div>

        <!-- ── 2. История решений ── -->
        <div class="prediction-skeleton__section">
          <h3 class="prediction-skeleton__section-title">
            <el-skeleton-item variant="text" style="width: 140px; height: 18px" />
          </h3>

          <ul class="prediction-skeleton__timeline">
            <li v-for="i in timelineItems" :key="`item-${i}`" class="prediction-skeleton__timeline-item">
              <div class="prediction-skeleton__timeline-node" />
              <div class="prediction-skeleton__timeline-body">
                <el-skeleton-item variant="text" style="width: 140px; height: 13px" />
                <el-skeleton-item variant="text" style="width: 60%; height: 14px" />
                <el-skeleton-item variant="text" style="width: 80px; height: 12px" />
              </div>
            </li>
          </ul>
        </div>
      </div>
    </template>
  </el-skeleton>
</template>

<style scoped>
.prediction-skeleton {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.prediction-skeleton__descriptions {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: var(--el-border-radius-base);
  overflow: hidden;
}

.prediction-skeleton__row {
  display: grid;
  grid-template-columns: 180px 1fr;
  align-items: center;
  border-bottom: 1px solid var(--el-border-color-lighter);
  min-height: 40px;
}

.prediction-skeleton__row:last-child {
  border-bottom: none;
}

.prediction-skeleton__label {
  padding: 13px 12px;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-light);
  display: flex;
  align-items: center;
}

.prediction-skeleton__label-text {
  width: 100px;
  height: 14px;
}

.prediction-skeleton__content {
  padding: 8px 12px;
  display: flex;
  align-items: center;
}

.prediction-skeleton__content :deep(.el-skeleton__item) {
  height: 14px;
}

.prediction-skeleton__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.prediction-skeleton__section-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.4;
}

.prediction-skeleton__timeline {
  list-style: none;
  margin: 0;
  padding: 40 0 0 4px;
  display: flex;
  flex-direction: column;
}

.prediction-skeleton__timeline-item {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 8px 0;
}

.prediction-skeleton__timeline-node {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--el-fill-color-darker);
  flex-shrink: 0;
  margin-top: 4px;
  position: relative;
  z-index: 1;
}

.prediction-skeleton__timeline-item:not(:last-child)::before {
  content: "";
  position: absolute;
  left: 4px;
  top: 20px;
  bottom: -8px;
  width: 2px;
  background: var(--el-border-color-lighter);
}

.prediction-skeleton__timeline-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
