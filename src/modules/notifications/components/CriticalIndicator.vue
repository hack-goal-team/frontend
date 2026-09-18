<script setup lang="ts">
import { computed } from "vue";
import { Warning } from "@element-plus/icons-vue";
import { useNotificationsStore } from "../store";
import { useCriticalNavigation } from "../useCriticalNavigation";

const store = useNotificationsStore();
const { showCritical } = useCriticalNavigation();

const count = computed(() => store.criticalCount);
const hasCount = computed(() => count.value > 0);

function onClick() {
  if (!hasCount.value) return;
  showCritical();
}
</script>

<template>
  <div class="critical-indicator" :class="{ 'is-clickable': hasCount }" @click="onClick">
    <el-badge :value="count" :hidden="!hasCount" type="danger" :max="99">
      <el-icon :size="20"><Warning /></el-icon>
    </el-badge>
  </div>
</template>

<style scoped>
.critical-indicator {
  display: flex;
  align-items: center;
  line-height: 1;
}

.critical-indicator.is-clickable {
  cursor: pointer;
}

.critical-indicator :deep(.el-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  vertical-align: middle; 
}

.critical-indicator :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
