import { get } from "@/shared/api/http";
import type { Dashboard } from "./types";

export function fetchDashboard(): Promise<Dashboard> {
  return get<Dashboard>("/dashboard");
}
