import type { Prediction } from "@/modules/predictions/types";
import { defineStore } from "pinia";
import { computed, ref } from "vue";

const MAX_NOTIFICATIONS = 20;

/** Сколько помним событие после ухода из снимка: риск, мигающий у порога HIGH, не тостит повторно. */
export const EVENT_GRACE_MS = 30 * 60_000;

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

  /** Событие → когда пара последний раз была в снимке; уход короче EVENT_GRACE_MS — не новое событие. */
  const seenEvents = new Map<string, number>();

  /**
   * `fresh` — id, которых не было в прошлом снимке (и пересчёты): по ним инвалидируется кэш.
   * Тост и лента — одна запись на событие «цель + тип». Неполный снимок (`complete=false`,
   * hasMore) ничего не забывает: хвост мог просто не влезть. Пересчёт обновляет запись ленты.
   */
  function onSnapshot(next: Prediction[], complete = true): { fresh: Prediction[]; toasts: Prediction[] } {
    const receivedAt = new Date();
    const now = receivedAt.getTime();

    const prevIds = new Set(snapshot.value.map((p) => p.id));
    const fresh = isFirstSnapshot ? [] : next.filter((p) => !prevIds.has(p.id));
    const events = uniqueEvents(next);
    const appeared = events.filter((p) => !seenEvents.has(eventKey(p)));

    for (const p of events) seenEvents.set(eventKey(p), now);
    if (complete) {
      for (const [key, seenAt] of seenEvents) if (now - seenAt > EVENT_GRACE_MS) seenEvents.delete(key);
    }

    snapshot.value = next;
    lastSnapshotAt.value = receivedAt;

    if (isFirstSnapshot) {
      isFirstSnapshot = false;
      return { fresh, toasts: appeared.filter((p) => p.status === "NEW") };
    }

    // Пересчёт той же пары: вероятность и ссылка в ленте — по последнему прогнозу.
    const latestByEvent = new Map(events.map((p) => [eventKey(p), p]));
    for (const item of recentNotifications.value) {
      const latest = latestByEvent.get(eventKey(item.prediction));
      if (latest && latest.id !== item.prediction.id) item.prediction = latest;
    }

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
    seenEvents.clear();
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
