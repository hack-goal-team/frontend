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

const COLUMNS = [
  { key: "incidentType", width: "140px", kind: "text", textWidth: "80%" },
  { key: "probability", width: "120px", kind: "text", textWidth: "60%" },
  { key: "horizonUntil", width: "160px", kind: "text", textWidth: "90%" },
  { key: "object", width: "200px", kind: "text", textWidth: "80%" },
  { key: "target", width: "180px", kind: "text", textWidth: "70%" },
  { key: "sensor", width: "180px", kind: "text", textWidth: "60%" },
  { key: "risk", width: "120px", kind: "tag" },
  { key: "decision", width: "220px", kind: "tag" },
  { key: "status", width: "120px", kind: "tag" },
  { key: "computedAt", width: "160px", kind: "text", textWidth: "90%" },
] as const;

const templateColumns = COLUMNS.map((c) => c.width).join(" ");
</script>

<template>
  <div class="table-skeleton">
    <el-skeleton :animated="animated" :throttle="throttle">
      <template #template>
        <div
          v-for="i in rows"
          :key="`row-${i}`"
          class="table-skeleton__row"
          :style="{ gridTemplateColumns: templateColumns }"
        >
          <div v-for="col in COLUMNS" :key="col.key" class="table-skeleton__cell">
            <el-skeleton-item v-if="col.kind === 'tag'" variant="rect" class="table-skeleton__tag" />
            <el-skeleton-item v-else variant="text" :style="{ width: col.textWidth }" class="table-skeleton__text" />
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
  align-items: center;
  padding: 0 12px;
  min-height: 48px;
  border-bottom: 1px solid var(--el-table-border-color, var(--el-border-color-lighter));
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
