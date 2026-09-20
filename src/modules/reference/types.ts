import type { Code } from "@/shared/api/types";

export interface ReferenceData {
  reasons: Code[];
  incidentTypes: string[];
  riskThresholds: { medium: number; high: number };
  predictionStatuses: string[];
}
