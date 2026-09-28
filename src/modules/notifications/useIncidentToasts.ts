import { h } from "vue";
import { useRouter } from "vue-router";
import { ElNotification, type NotificationHandle } from "element-plus";
import IncidentClassIcon from "@/modules/predictions/components/IncidentClassIcon.vue";
import type { Prediction } from "@/modules/predictions/types";
import { useLabels } from "@/modules/reference/composables/useLabels";
import { useCriticalNavigation } from "./useCriticalNavigation";
import { formatIncidentCounts, formatIncidentHeadline, formatIncidentPlace, formatIncidentsTotal } from "./lib/format";
import "element-plus/theme-chalk/el-notification.css";

/** Больше — сводный тост вместо пачки: стену тостов диспетчер не прочтёт. */
const MAX_SINGLE_TOASTS = 3;

/**
 * Тосты критических инцидентов (ТЗ :485 — вероятность, горизонт и место). Висят, пока
 * диспетчер не закроет или не кликнет; клик ведёт в карточку прогноза. `role="alert"`
 * у ElNotification уже даёт скринридеру срочное (assertive) объявление.
 */
export function useIncidentToasts() {
  const router = useRouter();
  const { incidentTypeLabel } = useLabels();
  const { showCritical } = useCriticalNavigation();

  const open: NotificationHandle[] = [];

  function track(handle: NotificationHandle) {
    open.push(handle);
    // Самый старый уступает место: на экране не больше MAX_SINGLE_TOASTS одиночных.
    while (open.length > MAX_SINGLE_TOASTS) open.shift()?.close();
  }

  function forget(handle: NotificationHandle) {
    const index = open.indexOf(handle);
    if (index >= 0) open.splice(index, 1);
  }

  function showSingle(prediction: Prediction) {
    const label = incidentTypeLabel(prediction.incidentType);

    const handle: NotificationHandle = ElNotification({
      type: "warning",
      duration: 0,
      position: "bottom-left",
      customClass: "incident-toast",
      message: h("div", { class: "incident-toast__body" }, [
        h("div", { class: "incident-toast__headline" }, [
          h(IncidentClassIcon, { code: prediction.incidentType }),
          formatIncidentHeadline(label, prediction.probability),
        ]),
        h("div", formatIncidentPlace(prediction)),
        prediction.context.sensorName
          ? h("div", { class: "incident-toast__sensor" }, prediction.context.sensorName)
          : null,
      ]),
      onClick: () => {
        router.push({ name: "predictions", query: { kind: "INCIDENT", selectedId: prediction.id, offset: "0" } });
        handle.close();
      },
      onClose: () => forget(handle),
    });
    track(handle);
  }

  function showSummary(predictions: Prediction[]) {
    const handle = ElNotification({
      type: "warning",
      duration: 0,
      position: "bottom-left",
      customClass: "incident-toast",
      title: formatIncidentsTotal(predictions.length),
      message: formatIncidentCounts(predictions.map((p) => incidentTypeLabel(p.incidentType))),
      onClick: () => {
        showCritical();
        handle.close();
      },
    });
  }

  function show(predictions: Prediction[]) {
    if (predictions.length === 0) return;
    if (predictions.length > MAX_SINGLE_TOASTS) showSummary(predictions);
    else predictions.forEach(showSingle);
  }

  return { show };
}
