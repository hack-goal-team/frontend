import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { dashboardKeys } from "@/modules/dashboard/keys";
import { predictionKeys } from "@/modules/predictions/keys";
import { useReferenceStore } from "@/modules/reference/store";
import { updateSettings } from "../api";
import { settingsKeys } from "../keys";
import type { SettingsUpdate } from "../types";

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const reference = useReferenceStore();

  return useMutation({
    mutationFn: (payload: SettingsUpdate) => updateSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
      // riskMedium/riskHigh меняют не только настройки: бэк пересчитывает по ним
      // riskLevel и status у прошлых прогнозов, поэтому протухают справочник,
      // журнал и сводка.
      void reference.reload();
      void queryClient.invalidateQueries({ queryKey: predictionKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
