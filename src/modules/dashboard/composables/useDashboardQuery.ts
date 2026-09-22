import { useQuery } from "@tanstack/vue-query";
import { fetchDashboard } from "../api";
import { dashboardKeys } from "../keys";

export function useDashboardQuery() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: fetchDashboard,
    staleTime: 30_000,
    // Прогнозы истекают по horizonUntil молча, без событий SSE: без рефетча
    // по времени счётчики стоят на вчерашнем снимке.
    refetchInterval: 60_000,
  });
}
