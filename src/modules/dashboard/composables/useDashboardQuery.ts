import { useQuery } from "@tanstack/vue-query";
import { fetchDashboard } from "../api";
import { dashboardKeys } from "../keys";

export function useDashboardQuery() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: fetchDashboard,
    staleTime: 30_000,
  });
}
