import { http, HttpResponse } from "msw";
import type {
  OdsPullResult,
  RegistryPullResult,
  RiverLevel,
  RiverPullResult,
  SettingsUpdate,
  WeatherPullResult,
} from "@/modules/settings/types";
import type { RefreshTarget } from "@/modules/settings/consts";
import { recomputeRiskLevels } from "../data/notifications";
import { mockSettings } from "../state/settings";
import { getCurrentUser } from "../state/auth";
import { appendAuditEntry } from "../data/audit";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

// Пользователь admin-source-down — сценарий «внешний источник недоступен»:
// все refresh-ручки отвечают 502.
const SOURCE_DOWN_USER = "admin-source-down";

// river.max-age из контракта: замер старше отдаём, но с outdated=true.
const RIVER_MAX_AGE_MS = 36 * 60 * 60_000;

// Начальный замер — «позавчерашний», чтобы предупреждение об устаревании было видно в dev.
const riverLevelState = {
  gaugeId: 208,
  gaugeName: "г/у Перерва в.б. (147 км)",
  measuredAt: new Date(Date.now() - 40 * 60 * 60_000).toISOString(),
  levelAbsM: 120.1,
  diffCm: -2,
};

function riverLevelResponse(): RiverLevel {
  const measuredAt = riverLevelState.measuredAt;
  return {
    ...riverLevelState,
    outdated: !measuredAt || Date.now() - Date.parse(measuredAt) > RIVER_MAX_AGE_MS,
  };
}

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
      category: "IMPORT",
      action: `${target.toUpperCase()}_REFRESH`,
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

function riverResult(): RiverPullResult {
  const now = new Date().toISOString();
  const gauges = 10 + Math.floor(Math.random() * 4);

  riverLevelState.measuredAt = now;
  riverLevelState.levelAbsM = Math.round((119.5 + Math.random() * 1.5) * 100) / 100;
  riverLevelState.diffCm = Math.round((Math.random() * 8 - 4) * 10) / 10;

  return {
    source: "river-mock",
    startedAt: now,
    durationMs: 200 + Math.floor(Math.random() * 600),
    gauges,
    rowsReceived: gauges,
    // Пост пишет раз в сутки: внеочередная загрузка часто не приносит новых строк.
    rowsInserted: Math.random() < 0.5 ? gauges : 0,
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
    return HttpResponse.json(mockSettings);
  }),

  http.put(`${BASE}/settings`, async ({ request }) => {
    await mockDelay(300, 700);

    const body = (await request.json()) as SettingsUpdate;

    if (!Number.isInteger(body?.decisionCoverHours) || body.decisionCoverHours < 1 || body.decisionCoverHours > 24) {
      return problem(400, "Bad Request", "decisionCoverHours должен быть целым числом в диапазоне [1, 24]");
    }
    if (!Number.isInteger(body?.sensorFreshHours) || body.sensorFreshHours < 1 || body.sensorFreshHours > 720) {
      return problem(400, "Bad Request", "sensorFreshHours должен быть целым числом в диапазоне [1, 720]");
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

    mockSettings.decisionCoverHours = body.decisionCoverHours;
    mockSettings.sensorFreshHours = body.sensorFreshHours;
    mockSettings.riskMedium = body.riskMedium;
    mockSettings.riskHigh = body.riskHigh;
    // На бэке riskLevel не хранится и считается на чтении, поэтому правка порогов
    // перекрашивает и прошлые прогнозы. Мок держит уровень в строке — пересчитываем
    // живую копию журнала здесь, иначе поведение страницы разошлось бы с контрактом.
    recomputeRiskLevels();
    mockSettings.updatedAt = new Date().toISOString();
    mockSettings.updatedBy = getCurrentUser()?.username ?? "unknown";

    appendAuditEntry({
      occurredAt: new Date().toISOString(),
      actor: mockSettings.updatedBy,
      category: "CHANGE_CONFIG",
      action: "CONFIG_UPDATE",
      target: "settings",
      payload: JSON.stringify(body),
    });

    return HttpResponse.json(mockSettings);
  }),

  refreshHandler("weather", weatherResult),
  refreshHandler("river", riverResult),
  refreshHandler("registry", registryResult),
  refreshHandler("ods", odsResult),

  // Области видимости нет: нужен только факт авторизации.
  http.get(`${BASE}/river-level`, async () => {
    await mockDelay(150, 400);
    return HttpResponse.json(riverLevelResponse());
  }),
];
