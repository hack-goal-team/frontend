import type { Prediction } from "@/modules/predictions/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const MAX_NOTIFICATIONS = 20;

/**
 * Запись в списке «Последние уведомления». Это скользящее окно текущей сессии,
 * а не журнал: SSE отдаёт снимок, историю он не хранит и после перезагрузки
 * списка нет — нельзя выдавать его за полную историю уведомлений.
 */
export interface PredictionNotification {
  id: string;
  prediction: Prediction;
  receivedAt: string;
}

export const useNotificationsStore = defineStore("notifications", () => {
  // --- состояние ---
  const snapshot = ref<Prediction[]>([]); // последний снимок
  const connected = ref(false); // SSE подключён
  const lastSnapshotAt = ref<Date | null>(null); // время последнего снимка
  const hasNewPredictions = ref(false); // есть новые id с прошлого снимка
  const newPredictionIds = ref<string[]>([]); // id, которых не было в предыдущем снимке
  const recentNotifications = ref<PredictionNotification[]>([]);

  let isFirstSnapshot = true;

  // --- вычисляемые ---
  const criticalCount = computed(() => snapshot.value.length);
  const unreviewedCriticalCount = computed(() => snapshot.value.filter((p) => p.status === "NEW").length);

  /**
   * `fresh` — прогнозы, которых не было в прошлом снимке: по ним инвалидируется кэш,
   * на первом снимке он пуст. `toasts` — что показать тостом: на первом снимке весь
   * снимок (диспетчер только вошёл и активных HIGH ещё не видел), дальше — `fresh`.
   */
  function onSnapshot(next: Prediction[]): { fresh: Prediction[]; toasts: Prediction[] } {
    const receivedAt = new Date();

    if (isFirstSnapshot) {
      snapshot.value = next;
      lastSnapshotAt.value = receivedAt;
      isFirstSnapshot = false;
      return { fresh: [], toasts: next };
    }

    // Считаем новые id
    const prevIds = new Set(snapshot.value.map((p) => p.id));
    const fresh = next.filter((p) => !prevIds.has(p.id));

    // Обновляем данные
    snapshot.value = next;
    lastSnapshotAt.value = receivedAt;

    if (fresh.length > 0) {
      // Накапливаем, не перезаписываем
      const existing = new Set(newPredictionIds.value);
      for (const p of fresh) existing.add(p.id);
      newPredictionIds.value = Array.from(existing);

      for (const p of fresh) {
        recentNotifications.value.unshift({
          id: p.id,
          prediction: p,
          receivedAt: receivedAt.toISOString(),
        });
      }
      recentNotifications.value.length = Math.min(recentNotifications.value.length, MAX_NOTIFICATIONS);

      hasNewPredictions.value = true;
    }

    return { fresh, toasts: fresh };
  }

  function clearNewPredictions() {
    hasNewPredictions.value = false;
    newPredictionIds.value = [];
  }

  function clearNotifications() {
    recentNotifications.value = [];
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
    recentNotifications.value = [];
    isFirstSnapshot = true;
  }

  return {
    snapshot,
    connected,
    lastSnapshotAt,
    hasNewPredictions,
    newPredictionIds,
    recentNotifications,
    criticalCount,
    unreviewedCriticalCount,
    onSnapshot,
    clearNewPredictions,
    clearNotifications,
    setConnected,
    reset,
  };
});
