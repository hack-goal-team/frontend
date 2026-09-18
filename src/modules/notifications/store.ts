import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { ElNotification } from "element-plus";
import type { Prediction } from "@/modules/predictions/types";
import { pluralize } from "@/shared/lib/pluralize";

export const useNotificationsStore = defineStore("notifications", () => {
  // --- состояние ---
  const snapshot = ref<Prediction[]>([]); // последний снимок
  const connected = ref(false); // SSE подключён
  const lastSnapshotAt = ref<Date | null>(null); // время последнего снимка
  const hasChanges = ref(false); // есть новые id с прошлого снимка
  const newIds = ref<string[]>([]); // id, которых не было в предыдущем снимке

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

    console.log(snapshot)

    // Уведомление — только если есть новые
    if (fresh.length > 0) {
      newIds.value = fresh.map((p) => p.id);
      hasChanges.value = true;

      ElNotification({
        title: "Критические прогнозы",
        message: `Обновилось ${fresh.length} ${pluralize(fresh.length)}`,
        type: "warning",
        duration: 5000,
        progress: true,
        position: "bottom-left",
      });
    }
  }

  function clearChanges() {
    hasChanges.value = false;
    newIds.value = [];
  }

  function setConnected(value: boolean) {
    connected.value = value;
  }

  function reset() {
    snapshot.value = [];
    connected.value = false;
    lastSnapshotAt.value = null;
    hasChanges.value = false;
    newIds.value = [];
    isFirstSnapshot = true;
  }

  return {
    snapshot,
    connected,
    lastSnapshotAt,
    hasChanges,
    newIds,
    criticalCount,
    onSnapshot,
    clearChanges,
    setConnected,
    reset,
  };
});
