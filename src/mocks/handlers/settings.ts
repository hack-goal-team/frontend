import { http, HttpResponse } from "msw";
import type {
  OdsPullResult,
  RegistryPullResult,
  SettingsUpdate,
  SettingsView,
  WeatherPullResult,
} from "@/modules/settings/types";
import type { RefreshTarget } from "@/modules/settings/consts";
import { getCurrentUser } from "../state/auth";
import { appendAuditEntry } from "../data/audit";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

const settingsState: SettingsView = {
  decisionCoverHours: 1,
  sensorFreshHours: 72,
  riskMedium: 0.4,
  riskHigh: 0.7,
  predictionHorizonHours: 24,
  updatedAt: null,
  updatedBy: null,
};

// Пользователь admin-source-down — сценарий «внешний источник недоступен»:
// все refresh-ручки отвечают 502.
const SOURCE_DOWN_USER = "admin-source-down";

// Refresh-ручка считается «занятой» на это время после запуска —
// повторный вызов в окне отвечает 409.
const RUNNING_WINDOW_MS = 4000;
const runningUntil: Partial<Record<RefreshTarget, number>> = {};

function isSourceDown(): boolean {
  return getCurrentUser()?.username === SOURCE_DOWN_USER;
}

function isRunning(target: RefreshTarget): boolean {
  return (runningUntil[target] ?? 0) > Date.now();
}

function refreshHandler(target: RefreshTarget, build: () => object) {
  return http.post(`${BASE}/admin/${target}/refresh`, async () => {
    await mockDelay(800, 1500);

    if (isSourceDown()) {
      return problem(502, "Bad Gateway", "Внешний источник недоступен");
    }

    if (isRunning(target)) {
      return problem(409, "Conflict", "Обновление уже выполняется");
    }
    runningUntil[target] = Date.now() + RUNNING_WINDOW_MS;

    // На бэке каждый вызов пишется в аудит — мок делает то же, иначе журнал аудита
    // не покажет действий, совершённых только что на странице настроек.
    const result = build();
    appendAuditEntry({
      occurredAt: new Date().toISOString(),
      actor: getCurrentUser()?.username ?? "unknown",
      category: "INTEGRATION",
      action: `REFRESH_${target.toUpperCase()}`,
      target,
      payload: JSON.stringify(result),
    });

    return HttpResponse.json(result);
  });
}

function weatherResult(): WeatherPullResult {
  return {
    source: "weather-api",
    startedAt: new Date().toISOString(),
    durationMs: 400 + Math.floor(Math.random() * 1200),
    districts: 12,
    rowsWritten: 220 + Math.floor(Math.random() * 180),
    gaps: Math.floor(Math.random() * 5),
  };
}

function registryResult(): RegistryPullResult {
  const now = new Date().toISOString();
  return {
    source: "registry-mock",
    startedAt: now,
    durationMs: 500 + Math.floor(Math.random() * 1000),
    channels: { fetched: 80 + Math.floor(Math.random() * 40), snapshotAt: now, changed: Math.random() < 0.5 },
    objects: { fetched: 10 + Math.floor(Math.random() * 8), snapshotAt: now, changed: Math.random() < 0.5 },
  };
}

function odsResult(): OdsPullResult {
  const now = new Date().toISOString();
  return {
    source: "ods-mock",
    startedAt: now,
    durationMs: 600 + Math.floor(Math.random() * 1400),
    fetched: 50 + Math.floor(Math.random() * 120),
    pages: 1 + Math.floor(Math.random() * 4),
    unknown: Math.floor(Math.random() * 6),
    cursorFrom: now,
    cursorTo: now,
    outcome: "OK",
  };
}

export const settingsHandlers = [
  http.get(`${BASE}/settings`, async () => {
    await mockDelay(200, 500);
    return HttpResponse.json(settingsState);
  }),

  http.put(`${BASE}/settings`, async ({ request }) => {
    await mockDelay(300, 700);

    const body = (await request.json()) as SettingsUpdate;

    if (!Number.isInteger(body?.decisionCoverHours) || body.decisionCoverHours < 1) {
      return problem(400, "Bad Request", "decisionCoverHours должен быть целым числом ≥ 1");
    }
    if (!Number.isInteger(body?.sensorFreshHours) || body.sensorFreshHours < 1) {
      return problem(400, "Bad Request", "sensorFreshHours должен быть целым числом ≥ 1");
    }
    if (typeof body?.riskMedium !== "number" || typeof body?.riskHigh !== "number") {
      return problem(400, "Bad Request", "riskMedium и riskHigh обязательны");
    }
    if (
      !(body.riskMedium >= 0 && body.riskMedium <= 1) ||
      !(body.riskHigh >= 0 && body.riskHigh <= 1) ||
      body.riskMedium >= body.riskHigh
    ) {
      return problem(400, "Bad Request", "Пороги должны быть в диапазоне [0, 1], MEDIUM меньше HIGH");
    }

    settingsState.decisionCoverHours = body.decisionCoverHours;
    settingsState.sensorFreshHours = body.sensorFreshHours;
    settingsState.riskMedium = body.riskMedium;
    settingsState.riskHigh = body.riskHigh;
    settingsState.updatedAt = new Date().toISOString();
    settingsState.updatedBy = getCurrentUser()?.username ?? "unknown";

    appendAuditEntry({
      occurredAt: new Date().toISOString(),
      actor: settingsState.updatedBy,
      category: "SETTINGS",
      action: "UPDATE",
      target: "settings",
      payload: JSON.stringify(body),
    });

    return HttpResponse.json(settingsState);
  }),

  refreshHandler("weather", weatherResult),
  refreshHandler("registry", registryResult),
  refreshHandler("ods", odsResult),
];
