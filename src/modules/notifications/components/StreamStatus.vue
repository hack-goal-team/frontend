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
    <div class="stream-status__label-time">
      <span class="stream-status__label">Данные обновлены:</span>
      <span class="stream-status__time">{{ lastSnapshotText }}</span>
    </div>
    <div class="stream-status__dot-status">
      <span class="stream-status__dot" :class="statusClass" />
      <span class="stream-status__status" :class="{ 'is-disconnected': !store.connected }">
        {{ statusText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.stream-status {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  white-space: nowrap;
}

.stream-status__label-time {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

/* Подпись — приглушённая */
.stream-status__label {
  color: var(--el-text-color-secondary);
}

.stream-status__dot-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

/* Время — основной цвет, чуть жирнее, моноширинные цифры */
.stream-status__time {
  color: var(--el-text-color-primary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

/* Точка — как было */
.stream-status__dot {
  width: 8px;
  height: 8px;
  border-radius: 40%;
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

/* Статус — акцент */
.stream-status__status {
  color: var(--el-color-success);
}
.stream-status__status.is-disconnected {
  color: var(--el-color-danger);
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
</style>
