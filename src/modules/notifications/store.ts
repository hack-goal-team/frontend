import type { Prediction } from "@/modules/predictions/types";
import { ElNotification } from "element-plus";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { formatNewPredictions } from "./lib/format";
import "element-plus/theme-chalk/el-notification.css";

export const useNotificationsStore = defineStore("notifications", () => {
  // --- состояние ---
  const snapshot = ref<Prediction[]>([]); // последний снимок
  const connected = ref(false); // SSE подключён
  const lastSnapshotAt = ref<Date | null>(null); // время последнего снимка
  const hasNewPredictions = ref(false); // есть новые id с прошлого снимка
  const newPredictionIds = ref<string[]>([]); // id, которых не было в предыдущем снимке

  let isFirstSnapshot = true;

  // --- вычисляемые ---
  const criticalCount = computed(() => snapshot.value.length);

  // --- действия ---
  function onSnapshot(next: Prediction[]) {
    const receivedAt = new Date();

    // Первый снимок — без уведомления
    if (isFirstSnapshot) {
      snapshot.value = next;
      lastSnapshotAt.value = receivedAt;
      isFirstSnapshot = false;
      return;
    }

    // Считаем новые id
    const prevIds = new Set(snapshot.value.map((p) => p.id));
    const fresh = next.filter((p) => !prevIds.has(p.id));

    // Обновляем данные
    snapshot.value = next;
    lastSnapshotAt.value = receivedAt;

    console.log(snapshot);

    if (fresh.length > 0) {
      // Накапливаем, не перезаписываем
      const existing = new Set(newPredictionIds.value);
      for (const p of fresh) existing.add(p.id);
      newPredictionIds.value = Array.from(existing);

      hasNewPredictions.value = true;

      ElNotification({
        title: "Критические прогнозы",
        message: formatNewPredictions(fresh.length),
        type: "warning",
        duration: 5000,
        progress: true,
        position: "bottom-left",
      });
    }
  }

  function clearNewPredictions() {
    hasNewPredictions.value = false;
    newPredictionIds.value = [];
  }

  function setConnected(value: boolean) {
    connected.value = value;
  }

  function reset() {
    snapshot.value = [];
    connected.value = false;
    lastSnapshotAt.value = null;
    hasNewPredictions.value = false;
    newPredictionIds.value = [];
    isFirstSnapshot = true;
  }

  return {
    snapshot,
    connected,
    lastSnapshotAt,
    hasNewPredictions,
    newPredictionIds,
    criticalCount,
    onSnapshot,
    clearNewPredictions,
    setConnected,
    reset,
  };
});
