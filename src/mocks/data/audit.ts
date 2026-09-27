import { makePickers } from "../lib/seededRandom";
import { AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/modules/audit/consts";
import type { AuditEntry } from "@/modules/audit/types";

const ACTORS = ["admin", "head", "global", "district", "technician"];

/** Сгенерировано ~10 суток с шагом ~45 минут: хватает и на «Показать ещё», и на фильтр по периоду. */
const ENTRY_COUNT = 320;
const STEP_MINUTES = 45;

interface PayloadTemplate {
  category: (typeof AUDIT_CATEGORIES)[number];
  action: (typeof AUDIT_ACTIONS)[number];
  target: () => string;
  payload: () => object;
}

/**
 * Категории — только закрытый enum контракта; действия берутся из открытого набора,
 * refresh-ручки настроек пишут те же коды, что и здесь (см. handlers/settings.ts).
 */
function templates(): PayloadTemplate[] {
  const jobId = () => `import/job/${1000 + Math.floor(Math.random() * 9000)}`;
  const prediction = () => `prediction/${2000 + Math.floor(Math.random() * 9000)}`;

  return [
    {
      category: "AUTHORIZATION",
      action: "LOGIN_SUCCEEDED",
      target: () => "session",
      payload: () => ({ method: "ldap" }),
    },
    {
      category: "AUTHORIZATION",
      action: "LOGIN_FAILED",
      target: () => "session",
      payload: () => ({ reason: "BAD_CREDENTIALS" }),
    },
    {
      category: "AUTHORIZATION",
      action: "LOGIN_DENIED",
      target: () => "session",
      payload: () => ({ reason: "NO_ROLE" }),
    },
    {
      category: "AUTHORIZATION",
      action: "LOGOUT",
      target: () => "session",
      payload: () => ({ method: "manual" }),
    },
    {
      category: "AUTHORIZATION",
      action: "ACCESS_DENIED",
      target: () => "GET /predictions",
      payload: () => ({ required: "PREDICTION_READ" }),
    },
    {
      category: "DECISION",
      action: "DECISION_CREATE",
      target: prediction,
      payload: () => ({ reasonCode: "CONFIRMED_BY_DISPATCHER" }),
    },
    {
      category: "CHANGE_CONFIG",
      action: "CONFIG_UPDATE",
      target: () => "settings",
      payload: () => ({
        decisionCoverHours: 1 + Math.floor(Math.random() * 6),
        sensorFreshHours: 24 + Math.floor(Math.random() * 72),
        riskMedium: 0.4,
        riskHigh: 0.7,
      }),
    },
    {
      category: "REPORT",
      action: "REPORT_GENERATE",
      target: () => "report/daily",
      payload: () => ({ period: "2026-09", rows: 120 + Math.floor(Math.random() * 400) }),
    },
    {
      category: "IMPORT",
      action: "IMPORT_START",
      target: jobId,
      payload: () => ({ fileName: "journal.csv" }),
    },
    {
      category: "IMPORT",
      action: "IMPORT_FINISH",
      target: jobId,
      payload: () => ({ rows: 5000 + Math.floor(Math.random() * 40000), failed: Math.floor(Math.random() * 40) }),
    },
    {
      category: "IMPORT",
      action: "WEATHER_REFRESH",
      target: () => "weather",
      payload: () => ({ districts: 12, rowsWritten: 220 + Math.floor(Math.random() * 180) }),
    },
    {
      category: "IMPORT",
      action: "REGISTRY_REFRESH",
      target: () => "registry",
      payload: () => ({ channels: 80 + Math.floor(Math.random() * 40), objects: 10 + Math.floor(Math.random() * 8) }),
    },
    {
      category: "IMPORT",
      action: "ODS_REFRESH",
      target: () => "ods",
      payload: () => ({ fetched: 50 + Math.floor(Math.random() * 120), pages: 1 + Math.floor(Math.random() * 4) }),
    },
  ];
}

function generateEntries(): AuditEntry[] {
  const pickers = makePickers(20260927);
  const options = templates();
  const entries: AuditEntry[] = [];

  // i растёт — время уходит в прошлое: массив рождается отсортированным по occurredAt desc,
  // на этот порядок полагается appendAuditEntry (unshift новой записи в начало).
  const now = Date.now();
  for (let i = 0; i < ENTRY_COUNT; i++) {
    const template = pickers.pick(options);
    entries.push({
      id: String(40_000 + i),
      occurredAt: new Date(now - i * STEP_MINUTES * 60_000 + pickers.int(-20, 20) * 60_000).toISOString(),
      actor: pickers.pick(ACTORS),
      category: template.category,
      action: template.action,
      target: template.target(),
      payload: JSON.stringify(template.payload()),
    });
  }

  return entries;
}

const liveEntries: AuditEntry[] = generateEntries();
let nextId = 40_000 + ENTRY_COUNT;

export function getLiveAuditEntries(): AuditEntry[] {
  return liveEntries;
}

/** Запись «прямо сейчас» — в начало массива, порядок по occurredAt desc сохраняется. */
export function appendAuditEntry(entry: Omit<AuditEntry, "id">): void {
  liveEntries.unshift({ id: String(nextId++), ...entry });
}
