<script setup lang="ts">
import { computed, reactive } from "vue";
import { isAxiosError } from "axios";
import { refreshOds, refreshRegistry, refreshWeather } from "@/modules/settings/api";
import { INTEGRATIONS, REFRESH_ERROR, type RefreshTarget } from "@/modules/settings/consts";
import { formatOdsResult, formatRegistryResult, formatWeatherResult } from "@/modules/settings/lib/formatResult";
import type { Problem } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/date";

type RunKind = "ok" | "conflict" | "unavailable" | "error";

interface RunState {
  loading: boolean;
  last: { kind: RunKind; text: string; at: string } | null;
}

const runs = reactive<Record<RefreshTarget, RunState>>({
  weather: { loading: false, last: null },
  registry: { loading: false, last: null },
  ods: { loading: false, last: null },
});

const rows = computed(() => INTEGRATIONS.map((integration) => ({ ...integration, run: runs[integration.target] })));

async function onRefresh(target: RefreshTarget) {
  const run = runs[target];
  if (run.loading) return;

  run.loading = true;
  try {
    let text: string;
    if (target === "weather") {
      text = formatWeatherResult(await refreshWeather());
    } else if (target === "registry") {
      text = formatRegistryResult(await refreshRegistry());
    } else {
      text = formatOdsResult(await refreshOds());
    }
    run.last = { kind: "ok", text, at: new Date().toISOString() };
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
