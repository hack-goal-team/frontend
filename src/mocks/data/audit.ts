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
  target: string;
  payload: () => object;
}

function templates(): PayloadTemplate[] {
  return [
    {
      category: "AUTH",
      action: "LOGIN",
      target: "session",
      payload: () => ({ method: "ldap", result: "OK" }),
    },
    {
      category: "AUTH",
      action: "LOGOUT",
      target: "session",
      payload: () => ({ method: "manual" }),
    },
    {
      category: "SETTINGS",
      action: "UPDATE",
      target: "settings",
      payload: () => ({
        decisionCoverHours: 1 + Math.floor(Math.random() * 6),
        sensorFreshHours: 24 + Math.floor(Math.random() * 72),
        riskMedium: 0.4,
        riskHigh: 0.7,
      }),
    },
    {
      category: "INTEGRATION",
      action: "REFRESH_WEATHER",
      target: "weather-api",
      payload: () => ({ districts: 12, rowsWritten: 220 + Math.floor(Math.random() * 180) }),
    },
    {
      category: "INTEGRATION",
      action: "REFRESH_REGISTRY",
      target: "registry",
      payload: () => ({ channels: 80 + Math.floor(Math.random() * 40), objects: 10 + Math.floor(Math.random() * 8) }),
    },
    {
      category: "INTEGRATION",
      action: "REFRESH_ODS",
      target: "ods",
      payload: () => ({ fetched: 50 + Math.floor(Math.random() * 120), pages: 1 + Math.floor(Math.random() * 4) }),
    },
    {
      category: "IMPORT",
      action: "CREATE",
      target: `import/job/${1000 + Math.floor(Math.random() * 9000)}`,
      payload: () => ({ fileName: "journal.csv", rows: 5000 + Math.floor(Math.random() * 40000) }),
    },
    {
      category: "DECISIONS",
      action: "COVER",
      target: `prediction/${2000 + Math.floor(Math.random() * 9000)}`,
      payload: () => ({ reasonCode: "CONFIRMED_BY_DISPATCHER" }),
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
      target: template.target,
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
