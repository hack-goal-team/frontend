<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
    animated?: boolean;
    throttle?: number | { leading?: number; trailing?: number; initVal?: boolean };
  }>(),
  {
    rows: 14,
    animated: true,
    throttle: 200,
  },
);

// Три кластера вместо плоской сетки: 1fr / auto / 1fr держит середину по центру при любой ширине.
const CLUSTERS = [
  { key: "left", columns: [{ key: "name", kind: "text", width: "60%" }] },
  {
    key: "center",
    columns: [
      { key: "level", kind: "tag" },
      { key: "risk", kind: "text", width: "102px" },
    ],
  },
  {
    key: "right",
    columns: [
      { key: "id", kind: "text", width: "70px" },
      { key: "snapshot", kind: "text", width: "128px" },
    ],
  },
] as const;
</script>

<template>
  <div class="table-skeleton">
    <el-skeleton :animated="animated" :throttle="throttle">
      <template #template>
        <div v-for="i in rows" :key="`row-${i}`" class="table-skeleton__row">
          <div
            v-for="cluster in CLUSTERS"
            :key="cluster.key"
            class="table-skeleton__cluster"
            :class="`table-skeleton__cluster_${cluster.key}`"
          >
            <template v-for="col in cluster.columns" :key="col.key">
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
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  min-height: 40px;
  border-bottom: 1px solid var(--el-table-border-color, var(--el-border-color-lighter));
}

.table-skeleton__cluster {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-skeleton__cluster_left {
  justify-self: stretch;
}

.table-skeleton__cluster_center {
  justify-self: center;
}

.table-skeleton__cluster_right {
  justify-self: end;
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
