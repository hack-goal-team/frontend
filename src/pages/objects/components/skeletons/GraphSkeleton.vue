<script setup lang="ts">
/**
 * Каркас экрана объекта: три колонки «предки → фокус → дети». Форма повторяет раскладку
 * графа, чтобы момент, когда вместо скелета появляется Vue Flow, не дёргал вёрстку страницы.
 */
withDefaults(defineProps<{ columns?: number; nodes?: number }>(), { columns: 3, nodes: 4 });

const COLUMNS = [1, 2, 3];
</script>

<template>
  <div class="graph-skeleton">
    <div v-for="column in COLUMNS.slice(0, columns)" :key="column" class="graph-skeleton__column">
      <el-skeleton animated :count="nodes">
        <template #template>
          <el-skeleton-item variant="rect" class="graph-skeleton__node" />
        </template>
      </el-skeleton>
    </div>
  </div>
</template>

<style scoped>
.graph-skeleton {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  gap: 72px;
  padding: 24px 32px;
  overflow: hidden;
}

.graph-skeleton__column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 248px;
  flex-shrink: 0;
}

.graph-skeleton__node {
  width: 100%;
  height: 76px;
  border-radius: var(--el-border-radius-base);
}
</style>
