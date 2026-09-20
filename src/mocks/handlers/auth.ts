import { http, HttpResponse } from "msw";
import type { CurrentUser } from "@/modules/auth/types";
import { getCurrentUser, setCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1";

interface MockUser {
  password: string;
  user: CurrentUser;
}

const MOCK_USERS: Record<string, MockUser> = {
  technician: {
    password: "technician",
    user: {
      username: "technician",
      displayName: "Техник",
      roles: ["TECHNICIAN"],
      permissions: ["PREDICTION_READ"],
      scope: {
        kind: "OBJECT",
        objectIds: [5],
        names: ["Объект Альфа"],
      },
    },
  },
  district: {
    password: "district",
    user: {
      username: "district",
      displayName: "Диспетчер района",
      roles: ["DISPATCHER_DISTRICT"],
      permissions: ["PREDICTION_READ", "DECISION_CREATE"],
      scope: {
        kind: "DISTRICT",
        objectIds: [5773],
        names: ["Район Северный"],
      },
    },
  },
  global: {
    password: "global",
    user: {
      username: "global",
      displayName: "Диспетчер ЦДС",
      roles: ["DISPATCHER_GLOBAL"],
      permissions: ["PREDICTION_READ", "DECISION_CREATE"],
      scope: {
        kind: "ALL",
        objectIds: [],
        names: [],
      },
    },
  },
  head: {
    password: "head",
    user: {
      username: "head",
      displayName: "Руководитель",
      roles: ["HEAD"],
      permissions: ["PREDICTION_READ", "REPORT_READ"],
      scope: {
        kind: "ALL",
        objectIds: [],
        names: [],
      },
    },
  },
  admin: {
    password: "admin",
    user: {
      username: "admin",
      displayName: "Администратор",
      roles: ["ADMIN"],
      permissions: ["SETTINGS_WRITE", "AUDIT_READ"],
      scope: {
        kind: "ALL",
        objectIds: [],
        names: [],
      },
    },
  },
  empty: {
    password: "empty",
    user: {
      username: "empty",
      displayName: "Без области",
      roles: ["TECHNICIAN"],
      permissions: ["PREDICTION_READ"],
      scope: {
        kind: "EMPTY",
        objectIds: [],
        names: [],
      },
    },
  },
};

export const authHandlers = [
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await mockDelay(200, 500);

    const body = (await request.json()) as {
      username: string;
      password: string;
    };

    if (!body.username || !body.password) {
      return problem(400, "Bad Request", "username and password required");
    }

    if (body.username === "norole" && body.password === "norole") {
      return problem(403, "Forbidden", "No role assigned. Contact your administrator.");
    }

    if (body.username === "catalog-down" && body.password === "anything") {
      return problem(503, "Service Unavailable", "LDAP catalog unavailable");
    }

    const found = MOCK_USERS[body.username];

    if (!found || found.password !== body.password) {
      return problem(401, "Unauthorized", "Invalid credentials");
    }

    setCurrentUser(found.user);
    return HttpResponse.json(found.user);
  }),

  http.post(`${BASE}/auth/logout`, async () => {
    await mockDelay(100, 300);

    setCurrentUser(null);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get(`${BASE}/auth/me`, async () => {
    await mockDelay(100, 300);

    const user = getCurrentUser();

    if (!user) {
      return problem(401, "Unauthorized", "Not authenticated");
    }

    return HttpResponse.json(user);
  }),
];
