import type { Code } from "@/shared/api/types";

export interface ReferenceData {
  reasons: Code[];
  incidentTypes: Code[];
  riskThresholds: { medium: number; high: number };
  predictionStatuses: Code[];
}
