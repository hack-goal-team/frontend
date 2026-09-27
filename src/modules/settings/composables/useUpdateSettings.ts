import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { updateSettings } from "../api";
import { settingsKeys } from "../keys";
import type { SettingsUpdate } from "../types";

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SettingsUpdate) => updateSettings(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
