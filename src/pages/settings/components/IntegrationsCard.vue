<script setup lang="ts">
import { computed, reactive } from "vue";
import { isAxiosError } from "axios";
import { useQueryClient } from "@tanstack/vue-query";
import { refreshOds, refreshRegistry, refreshRiver, refreshWeather } from "@/modules/settings/api";
import { useRiverLevelQuery } from "@/modules/settings/composables/useRiverLevelQuery";
import { INTEGRATIONS, REFRESH_ERROR, type RefreshTarget } from "@/modules/settings/consts";
import {
  formatOdsResult,
  formatRegistryResult,
  formatRiverResult,
  formatWeatherResult,
} from "@/modules/settings/lib/formatResult";
import { formatRiverLevel } from "@/modules/settings/lib/formatLevel";
import { riverLevelKeys } from "@/modules/settings/keys";
import type { Problem } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/date";

type RunKind = "ok" | "conflict" | "unavailable" | "error";

interface RunState {
  loading: boolean;
  last: { kind: RunKind; text: string; at: string } | null;
}

const runs = reactive<Record<RefreshTarget, RunState>>({
  weather: { loading: false, last: null },
  river: { loading: false, last: null },
  registry: { loading: false, last: null },
  ods: { loading: false, last: null },
});

const REFRESH: Record<RefreshTarget, () => Promise<string>> = {
  weather: async () => formatWeatherResult(await refreshWeather()),
  river: async () => formatRiverResult(await refreshRiver()),
  registry: async () => formatRegistryResult(await refreshRegistry()),
  ods: async () => formatOdsResult(await refreshOds()),
};

const queryClient = useQueryClient();
const { data: riverLevel, isError: isRiverLevelError } = useRiverLevelQuery();

const rows = computed(() => INTEGRATIONS.map((integration) => ({ ...integration, run: runs[integration.target] })));

const riverLevelText = computed(() => (riverLevel.value ? formatRiverLevel(riverLevel.value) : ""));

async function onRefresh(target: RefreshTarget) {
  const run = runs[target];
  if (run.loading) return;

  run.loading = true;
  try {
    const text = await REFRESH[target]();
    run.last = { kind: "ok", text, at: new Date().toISOString() };
    // Замер реки — единственный источник, чей результат видно на самой странице.
    if (target === "river") void queryClient.invalidateQueries({ queryKey: riverLevelKeys.all });
  } catch (error) {
    const kind = classify(error);
    run.last = { kind, text: messageFor(error, kind), at: new Date().toISOString() };
  } finally {
    run.loading = false;
  }
}

function classify(error: unknown): RunKind {
  if (isAxiosError<Problem>(error)) {
    const status = error.response?.status;
    if (status === 409) return "conflict";
    if (status === 502) return "unavailable";
  }
  return "error";
}

function messageFor(error: unknown, kind: RunKind): string {
  if (kind === "conflict") return REFRESH_ERROR.conflict;
  if (kind === "unavailable") return REFRESH_ERROR.unavailable;
  if (isAxiosError<Problem>(error)) {
    return error.response?.data?.detail ?? error.response?.data?.title ?? REFRESH_ERROR.generic;
  }
  return REFRESH_ERROR.generic;
}

const ALERT_TYPE: Record<Exclude<RunKind, "ok">, "warning" | "error"> = {
  conflict: "warning",
  unavailable: "error",
  error: "error",
};
</script>

<template>
  <el-card shadow="never">
    <template #header>
      <span>Интеграции</span>
    </template>

    <div class="integrations__rows">
      <div v-for="row in rows" :key="row.target" class="integrations__row">
        <div class="integrations__source">
          <div class="integrations__title">{{ row.title }}</div>
          <div class="integrations__description">{{ row.description }}</div>
          <div v-if="row.target === 'river'" class="integrations__level">
            <template v-if="riverLevel">
              <el-tag v-if="riverLevel.outdated" type="warning" size="small">Замер устарел</el-tag>
              <span>{{ riverLevelText || "Замеров ещё не было" }}</span>
            </template>
            <span v-else-if="isRiverLevelError" class="integrations__level-empty">Уровень недоступен</span>
          </div>
        </div>

        <el-button :loading="row.run.loading" @click="onRefresh(row.target)">Обновить</el-button>

        <div class="integrations__result">
          <div v-if="row.run.last?.kind === 'ok'" class="integrations__result-ok">{{ row.run.last.text }}</div>
          <el-alert
            v-else-if="row.run.last"
            :type="ALERT_TYPE[row.run.last.kind]"
            :closable="false"
            show-icon
            :title="row.run.last.text"
          >
            <span class="integrations__result-time">{{ formatDateTime(row.run.last.at) }}</span>
          </el-alert>
          <span v-else class="integrations__result-empty">Ещё не запускалось</span>
        </div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.integrations__row {
  display: grid;
  grid-template-columns: minmax(220px, 340px) auto minmax(0, 1fr);
  gap: 12px 16px;
  align-items: center;
  padding: 14px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.integrations__row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.integrations__row:first-child {
  padding-top: 0;
}

.integrations__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.integrations__description {
  margin-top: 2px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.integrations__level {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.integrations__level-empty {
  color: var(--el-text-color-placeholder);
}

.integrations__result-ok {
  font-size: 13px;
  color: var(--el-color-success);
}

.integrations__result-empty {
  font-size: 13px;
  color: var(--el-text-color-placeholder);
}

.integrations__result-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
