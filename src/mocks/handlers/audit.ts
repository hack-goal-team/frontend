import { http, HttpResponse } from "msw";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { getLiveAuditEntries } from "../data/audit";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100_000;

/**
 * `GET /audit?limit=&offset=&from=&to=&actor=&category=&action=` — страница `PageAuditEntry`.
 * Счётчика `X-Total-Count` в контракте нет, `hasMore` — единственный признак продолжения.
 *
 * Фильтры по контракту: период `[from, to)`, actor/category — одиночные строки,
 * `action` — массив (повторяющийся параметр). Семантика строковых фильтров бэком не
 * оговорена, мок принимает actor как вхождение без учёта регистра, остальные — точно.
 */
export const auditHandlers = [
  http.get(`${BASE}/audit`, async ({ request }) => {
    const user = getCurrentUser();

    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }
    if (!hasPermission(user, PERMISSIONS.AUDIT_READ)) {
      return problem(403, "Forbidden", "AUDIT_READ required");
    }

    const p = new URL(request.url).searchParams;

    const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "") || DEFAULT_LIMIT, 1), MAX_LIMIT);
    const offset = Math.min(Math.max(parseInt(p.get("offset") ?? "") || 0, 0), MAX_OFFSET);

    const fromMs = Date.parse(p.get("from") ?? "");
    const toMs = Date.parse(p.get("to") ?? "");
    const actor = p.get("actor")?.trim().toLowerCase() ?? "";
    const category = p.get("category") ?? "";
    const actions = p.getAll("action");

    const filtered = getLiveAuditEntries().filter((entry) => {
      const ts = Date.parse(entry.occurredAt);
      if (!Number.isNaN(fromMs) && ts < fromMs) return false;
      if (!Number.isNaN(toMs) && ts >= toMs) return false;
      if (actor && !entry.actor.toLowerCase().includes(actor)) return false;
      if (category && entry.category !== category) return false;
      if (actions.length > 0 && !actions.includes(entry.action)) return false;
      return true;
    });

    const pageItems = filtered.slice(offset, offset + limit);

    await mockDelay();

    return HttpResponse.json({
      items: pageItems,
      limit,
      offset,
      hasMore: offset + limit < filtered.length,
    });
  }),
];
