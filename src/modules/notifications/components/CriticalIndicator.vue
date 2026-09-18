<script setup lang="ts">
import { computed } from "vue";
import { Bell } from "@element-plus/icons-vue";
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
      <el-icon :size="20"><Bell /></el-icon>
    </el-badge>
  </div>
</template>

<style scoped>
.critical-indicator {
  display: inline-flex;
  align-items: center;
}
.critical-indicator.is-clickable {
  cursor: pointer;
}
</style>
