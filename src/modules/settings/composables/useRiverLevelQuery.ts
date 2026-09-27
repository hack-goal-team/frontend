import { useQuery } from "@tanstack/vue-query";
import { fetchRiverLevel } from "../api";
import { riverLevelKeys } from "../keys";

export function useRiverLevelQuery() {
  return useQuery({
    queryKey: riverLevelKeys.current(),
    queryFn: fetchRiverLevel,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}
