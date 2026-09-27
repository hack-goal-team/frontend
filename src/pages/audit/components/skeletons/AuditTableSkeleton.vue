<script setup lang="ts">
withDefaults(
  defineProps<{
    rows?: number;
    animated?: boolean;
    throttle?: number | { leading?: number; trailing?: number; initVal?: boolean };
  }>(),
  {
    rows: 25,
    animated: true,
    throttle: 200,
  },
);

// Ширины повторяют колонки AuditTable.vue, последняя ячейка добирает остаток.
const COLUMNS = [
  { key: "expand", width: "44px" },
  { key: "occurredAt", width: "150px" },
  { key: "actor", width: "170px" },
  { key: "category", width: "140px" },
  { key: "action", width: "200px" },
] as const;

const templateColumns = [...COLUMNS.map((c) => c.width), "1fr"].join(" ");
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
          <el-skeleton-item variant="circle" class="table-skeleton__expand" />
          <el-skeleton-item
            v-for="col in COLUMNS.slice(1)"
            :key="col.key"
            variant="text"
            class="table-skeleton__text"
          />
          <el-skeleton-item variant="text" class="table-skeleton__text" />
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
  gap: 16px;
  padding: 0 12px;
  min-height: 40px;
  border-bottom: 1px solid var(--el-table-border-color, var(--el-border-color-lighter));
}

.table-skeleton__text {
  height: 14px;
}

.table-skeleton__expand {
  width: 12px;
  height: 12px;
}
</style>
