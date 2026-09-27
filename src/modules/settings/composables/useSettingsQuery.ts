import { useQuery } from "@tanstack/vue-query";
import { fetchSettings } from "../api";
import { settingsKeys } from "../keys";

export function useSettingsQuery() {
  return useQuery({
    queryKey: settingsKeys.view(),
    queryFn: fetchSettings,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
