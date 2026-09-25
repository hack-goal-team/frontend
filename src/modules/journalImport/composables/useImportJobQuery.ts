import { useQuery } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import { fetchImportJob } from "../api";
import { journalImportKeys } from "../keys";

const STATUS_POLL_INTERVAL_MS = 1000;

export function useImportJobQuery(jobId: Ref<string | null>) {
  return useQuery({
    queryKey: computed(() => journalImportKeys.job(jobId.value ?? "")),
    queryFn: () => fetchImportJob(jobId.value as string),
    enabled: computed(() => jobId.value !== null),
    // Пока задача не завершилась, опрашиваем статус; готовый результат не дёргаем.
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "QUEUED" || status === "RUNNING" ? STATUS_POLL_INTERVAL_MS : false;
    },
  });
}
