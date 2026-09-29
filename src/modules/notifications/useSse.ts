import { onMounted, onUnmounted } from "vue";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useNotificationsStore } from "./store";
import { useIncidentToasts } from "./useIncidentToasts";
import { useQueryClient } from "@tanstack/vue-query";
import { predictionKeys } from "@/modules/predictions/keys";
import type { PredictionPage } from "@/modules/predictions/types";
import { dashboardKeys } from "../dashboard/keys";
import { objectsKeys } from "../objects/keys";
import { channelsKeys } from "../channels/keys";
import { useAuthStore } from "@/modules/auth/store";
import { PERMISSIONS } from "@/modules/auth/consts";

const RECONNECT_DELAY = 5000;

export function useSse() {
  const auth = useAuthStore();
  const store = useNotificationsStore();
  const queryClient = useQueryClient();
  const { show: showToasts } = useIncidentToasts();

  let abortController: AbortController | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isUnmounted = false;

  /**
   * Серверный риск приехал в сами списки: `/objects?withRisk` и `/channels?withRisk`, —
   * поэтому на новый критический прогноз (и после переподключения) обновляем сводку
   * панели, реестр и страницы каналов. Отдельного ключа под скан прогнозов больше нет.
   * Цена инвалидации каналов — перезагрузка накопленных страниц открытого графа:
   * риск канала живёт в его странице, а устаревший цвет хуже перезагрузки.
   */
  function invalidateRiskBearingLists() {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    queryClient.invalidateQueries({ queryKey: objectsKeys.all });
    queryClient.invalidateQueries({ queryKey: channelsKeys.all });
  }

  async function connect() {
    if (isUnmounted) return;

    // Снимок в стриме — критические прогнозы, и endpoint требует PREDICTION_READ.
    // Без права запрос отвечает 403, а onerror реконнектил бы его каждые 5 секунд.
    if (!auth.hasPermission(PERMISSIONS.PREDICTION_READ)) return;

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
              invalidateRiskBearingLists();
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
            const { fresh, toasts } = store.onSnapshot(page.items);
            showToasts(toasts);

            // Новый критический прогноз меняет и сводку панели — не ждём рефетч по времени
            if (fresh.length > 0) {
              invalidateRiskBearingLists();
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
