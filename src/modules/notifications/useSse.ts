import { onMounted, onUnmounted } from "vue";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useNotificationsStore } from "./store";
import { useQueryClient } from "@tanstack/vue-query";
import { predictionKeys } from "@/modules/predictions/keys";
import type { PredictionPage } from "@/modules/predictions/types";
import { dashboardKeys } from "../dashboard/keys";

const RECONNECT_DELAY = 5000;

export function useSse() {
  const store = useNotificationsStore();
  const queryClient = useQueryClient();

  let abortController: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isUnmounted = false;

  async function connect() {
    if (isUnmounted) return;

    abortController = new AbortController();

    try {
      await fetchEventSource(`${import.meta.env.VITE_API_URL}/notifications/stream`, {
        credentials: "include",
        headers: {
          Accept: "text/event-stream",
        },
        signal: abortController.signal,

        async onopen(response) {
          if (response.ok) {
            const wasDisconnected = !store.connected;
            store.setConnected(true);

            // После переподключения — refresh REST data
            if (wasDisconnected) {
              queryClient.invalidateQueries({ queryKey: predictionKeys.all });
              queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
            }
            return;
          }

          // Не 2xx — бросаем, чтобы сработал onerror
          throw new Error(`SSE failed: ${response.status}`);
        },

        onmessage(event) {
          if (event.event !== "critical-predictions") return;

          try {
            const page = JSON.parse(event.data) as PredictionPage;
            const fresh = store.onSnapshot(page.items);

            // Новый критический прогноз меняет и сводку панели — не ждём рефетч по времени
            if (fresh.length > 0) {
              queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
            }
          } catch (e) {
            console.warn("[SSE] failed to parse message", e);
          }
        },

        onerror(err) {
          // fetchEventSource: если onerror не бросает — переподключится сам
          // Мы хотим контролировать задержку — бросаем и реконнектим вручную
          console.warn("[SSE] error", err);
          store.setConnected(false);
          throw err;
        },

        onclose() {
          // Сервер закрыл стрим (30 минут)
          store.setConnected(false);
          scheduleReconnect();
        },
      });
    } catch {
      // fetchEventSource выбросил — реконнект
      if (isUnmounted) return;
      store.setConnected(false);
      scheduleReconnect();
    }
  }

  function scheduleReconnect() {
    if (isUnmounted) return;
    if (reconnectTimer) return;

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, RECONNECT_DELAY);
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    abortController?.abort();
    abortController = null;
    store.setConnected(false);
  }

  onMounted(() => {
    isUnmounted = false;
    connect();
  });

  onUnmounted(() => {
    isUnmounted = true;
    disconnect();
  });

  return { connect, disconnect };
}
