export const PERMISSIONS = {
  PREDICTION_READ: "PREDICTION_READ",
  DECISION_CREATE: "DECISION_CREATE",
  REPORT_READ: "REPORT_READ",
  SETTINGS_WRITE: "SETTINGS_WRITE",
  AUDIT_READ: "AUDIT_READ",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ALL_PERMISSIONS: readonly Permission[] = Object.values(PERMISSIONS);
