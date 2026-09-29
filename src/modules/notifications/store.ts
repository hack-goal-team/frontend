import type { Prediction } from "@/modules/predictions/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const MAX_NOTIFICATIONS = 20;

/** Событие риска — пара «цель + тип инцидента»: пересчёт даёт новый id, но не новое событие. */
function eventKey(p: Prediction): string {
  return `${p.targetKind}:${p.targetRef}:${p.incidentType}`;
}

function uniqueEvents(items: Prediction[]): Prediction[] {
  const seen = new Set<string>();
  return items.filter((p) => {
    const key = eventKey(p);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

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
   * `fresh` — id, которых не было в прошлом снимке (и пересчёты): по ним инвалидируется кэш.
   * Тост и лента — одна запись на событие: пара «цель + тип», которой в прошлом снимке не было.
   * На первом снимке тост на весь снимок (диспетчер только вошёл), разобранные (не NEW) не нужны.
   */
  function onSnapshot(next: Prediction[]): { fresh: Prediction[]; toasts: Prediction[] } {
    const receivedAt = new Date();

    if (isFirstSnapshot) {
      snapshot.value = next;
      lastSnapshotAt.value = receivedAt;
      isFirstSnapshot = false;
      return { fresh: [], toasts: uniqueEvents(next).filter((p) => p.status === "NEW") };
    }

    // Считаем новые id
    const prevIds = new Set(snapshot.value.map((p) => p.id));
    const fresh = next.filter((p) => !prevIds.has(p.id));
    const prevEvents = new Set(snapshot.value.map(eventKey));
    const appeared = uniqueEvents(next.filter((p) => !prevEvents.has(eventKey(p))));

    // Обновляем данные
    snapshot.value = next;
    lastSnapshotAt.value = receivedAt;

    if (appeared.length > 0) {
      // Накапливаем, не перезаписываем
      const existing = new Set(newPredictionIds.value);
      for (const p of appeared) existing.add(p.id);
      newPredictionIds.value = Array.from(existing);

      for (const p of appeared) {
        recentNotifications.value.unshift({
          id: p.id,
          prediction: p,
          receivedAt: receivedAt.toISOString(),
        });
      }
      recentNotifications.value.length = Math.min(recentNotifications.value.length, MAX_NOTIFICATIONS);

      hasNewPredictions.value = true;
    }

    return { fresh, toasts: appeared.filter((p) => p.status === "NEW") };
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
