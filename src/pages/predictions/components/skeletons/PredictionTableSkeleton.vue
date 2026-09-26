<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
    animated?: boolean;
    throttle?: number | { leading?: number; trailing?: number; initVal?: boolean };
  }>(),
  {
    rows: 20,
    animated: true,
    throttle: 200,
  },
);

// Левый блок — как был: фиксированные колонки без изменений.
const LEFT_COLUMNS = [
  { key: "incidentType", width: "420px", textWidth: "80%" },
  { key: "probability", width: "100px", textWidth: "60%" },
  { key: "horizonUntil", width: "60px", textWidth: "90%" },
  { key: "object", width: "200px", textWidth: "80%" },
  { key: "target", width: "180px", textWidth: "70%" },
  { key: "sensor", width: "180px", textWidth: "60%" },
] as const;

// Крайние блоки фиксированной ширины, середина — 1fr: «риск + решение» центрируются
// в свободном месте между блоками (левый блок шире правого, поэтому не в центре строки).
const CENTER_COLUMNS = [{ key: "risk" }] as const;

const RIGHT_COLUMNS = [
  { key: "state", kind: "tag" },
  { key: "status", kind: "tag" },
  { key: "computedAt", kind: "text", width: "144px" },
] as const;

const leftTemplateColumns = LEFT_COLUMNS.map((c) => c.width).join(" ");
</script>

<template>
  <div class="table-skeleton">
    <el-skeleton :animated="animated" :throttle="throttle">
      <template #template>
        <div v-for="i in rows" :key="`row-${i}`" class="table-skeleton__row">
          <div
            class="table-skeleton__cluster table-skeleton__cluster_left"
            :style="{ gridTemplateColumns: leftTemplateColumns }"
          >
            <div v-for="col in LEFT_COLUMNS" :key="col.key" class="table-skeleton__cell">
              <el-skeleton-item variant="text" :style="{ width: col.textWidth }" class="table-skeleton__text" />
            </div>
          </div>

          <div class="table-skeleton__cluster table-skeleton__cluster_center">
            <el-skeleton-item v-for="col in CENTER_COLUMNS" :key="col.key" variant="rect" class="table-skeleton__tag" />
          </div>

          <div class="table-skeleton__cluster table-skeleton__cluster_right">
            <template v-for="col in RIGHT_COLUMNS" :key="col.key">
              <el-skeleton-item v-if="col.kind === 'tag'" variant="rect" class="table-skeleton__tag" />
              <el-skeleton-item v-else variant="text" :style="{ width: col.width }" class="table-skeleton__text" />
            </template>
          </div>
        </div>
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.table-skeleton {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.table-skeleton__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  min-height: 40px;
  border-bottom: 1px solid var(--el-table-border-color, var(--el-border-color-lighter));
}

.table-skeleton__cluster {
  display: flex;
  align-items: center;
  gap: 82px;
}

.table-skeleton__cluster_left {
  display: grid;
  gap: 0;
}

.table-skeleton__cluster_center {
  justify-self: center;
}

.table-skeleton__cluster_right {
  justify-self: end;
}

.table-skeleton__cell {
  padding: 0 12px;
  display: flex;
  align-items: center;
}

.table-skeleton__text {
  height: 14px;
}

.table-skeleton__tag {
  width: 60px;
  height: 24px;
  border-radius: 4px;
}
</style>
