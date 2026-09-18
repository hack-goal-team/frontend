<script setup lang="ts">
import { computed } from "vue";
import dayjs from "dayjs";
import { useNotificationsStore } from "../store";

const store = useNotificationsStore();

const lastSnapshotText = computed(() => {
  if (!store.lastSnapshotAt) return "Нет данных";
  return dayjs(store.lastSnapshotAt).format("HH:mm:ss");
});

const statusText = computed(() => (store.connected ? "Подключено" : "Отключено"));

const statusClass = computed(() => (store.connected ? "is-connected" : "is-disconnected"));
</script>

<template>
  <div class="stream-status">
    <span class="stream-status__time"> Данные обновлены: {{ lastSnapshotText }} </span>
    <span class="stream-status__dot" :class="statusClass" />
    <span class="stream-status__label">{{ statusText }}</span>
  </div>
</template>

<style scoped>
.stream-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  white-space: nowrap;
}

.stream-status__time {
  font-variant-numeric: tabular-nums; /* чтобы цифры не «прыгали» */
}

.stream-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--el-color-info);
  transition: background 0.3s;
}

.stream-status__dot.is-connected {
  background: var(--el-color-success);
  box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
  animation: pulse 2s ease-in-out infinite;
}

.stream-status__dot.is-disconnected {
  background: var(--el-color-danger);
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(103, 194, 58, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(103, 194, 58, 0.05);
  }
}

.stream-status__label {
  color: var(--el-text-color-secondary);
}
</style>
