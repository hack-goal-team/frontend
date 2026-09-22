import type { Prediction } from "@/modules/predictions/types";
import { ElNotification } from "element-plus";
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { formatNewPredictions } from "./lib/format";
import "element-plus/theme-chalk/el-notification.css";

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
   * @returns прогнозы, которых не было в предыдущем снимке — по ним внешние
   * коды переинвалидируют кэш. Пустой массив на первом снимке: стартовая
   * выборка не «новые» прогнозы.
   */
  function onSnapshot(next: Prediction[]): Prediction[] {
    const receivedAt = new Date();

    // Первый снимок — без уведомления
    if (isFirstSnapshot) {
      snapshot.value = next;
      lastSnapshotAt.value = receivedAt;
      isFirstSnapshot = false;
      return [];
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

      ElNotification({
        title: "Прогнозы высокого риска",
        message: `${formatNewPredictions(fresh.length)}. Смотрите на «Аналитической панели».`,
        type: "warning",
        duration: 5000,
        progress: true,
        position: "bottom-left",
      });
    }

    return fresh;
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
