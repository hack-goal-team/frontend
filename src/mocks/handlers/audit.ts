import { http, HttpResponse } from "msw";
import { PERMISSIONS } from "@/modules/auth/consts";
import { hasPermission } from "@/modules/auth/lib/hasPermission";
import { AUDIT_ACTION_PATTERN, AUDIT_CATEGORIES } from "@/modules/audit/consts";
import { getLiveAuditEntries } from "../data/audit";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_OFFSET = 100_000;

/**
 * `GET /audit?limit=&offset=&from=&to=&actor=&category=&action=` — страница записей
 * + `X-Total-Count` по отфильтрованной выдаче (фронт считает постраничную навигацию от неё;
 * `hasMore` в теле остаётся, но на этом экране не используется).
 *
 * Семантика по контракту: свежее сверху, пустой параметр — без фильтра, период `[from, to)`,
 * actor — точное совпадение логина, category — закрытый enum, action — повторяемый параметр
 * с открытым набором кодов. Мусорные значения (вне enum, код не по паттерну, непарсящаяся дата)
 * бэк отсекает 400 — мок делает то же, чтобы рассинхрон фильтра виден был сразу.
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

    const rawFrom = p.get("from");
    const rawTo = p.get("to");
    const fromMs = rawFrom ? Date.parse(rawFrom) : NaN;
    const toMs = rawTo ? Date.parse(rawTo) : NaN;
    if (rawFrom && Number.isNaN(fromMs)) {
      return problem(400, "Bad Request", "from должен быть ISO 8601 с зоной");
    }
    if (rawTo && Number.isNaN(toMs)) {
      return problem(400, "Bad Request", "to должен быть ISO 8601 с зоной");
    }

    const actor = p.get("actor") ?? "";
    const category = p.get("category") ?? "";
    if (category && !(AUDIT_CATEGORIES as readonly string[]).includes(category)) {
      return problem(400, "Bad Request", `category должен быть одним из: ${AUDIT_CATEGORIES.join(", ")}`);
    }

    const actions = p.getAll("action");
    if (actions.some((a) => !AUDIT_ACTION_PATTERN.test(a))) {
      return problem(400, "Bad Request", "action должен соответствовать ^[A-Z][A-Z_]{0,63}$");
    }

    const filtered = getLiveAuditEntries().filter((entry) => {
      const ts = Date.parse(entry.occurredAt);
      if (!Number.isNaN(fromMs) && ts < fromMs) return false;
      if (!Number.isNaN(toMs) && ts >= toMs) return false;
      if (actor && entry.actor !== actor) return false;
      if (category && entry.category !== category) return false;
      if (actions.length > 0 && !actions.includes(entry.action)) return false;
      return true;
    });

    const pageItems = filtered.slice(offset, offset + limit);

    await mockDelay();

    return HttpResponse.json(
      {
        items: pageItems,
        limit,
        offset,
        hasMore: offset + limit < filtered.length,
      },
      { headers: { "X-Total-Count": String(filtered.length) } },
    );
  }),
];
