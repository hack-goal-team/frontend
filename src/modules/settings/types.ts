export interface SettingsView {
  decisionCoverHours: number;
  sensorFreshHours: number;
  riskMedium: number;
  riskHigh: number;
  predictionHorizonHours: number;
  updatedAt: string | null;
  updatedBy: string | null;
}

export interface SettingsUpdate {
  decisionCoverHours: number;
  sensorFreshHours: number;
  riskMedium: number;
  riskHigh: number;
}

export interface PullPart {
  fetched: number;
  snapshotAt: string | null;
  changed: boolean;
}

export interface WeatherPullResult {
  source: string;
  startedAt: string;
  durationMs: number;
  districts: number;
  rowsWritten: number;
  gaps: number;
}

export interface RegistryPullResult {
  source: string;
  startedAt: string;
  durationMs: number;
  channels: PullPart;
  objects: PullPart;
}

export interface OdsPullResult {
  source: string;
  startedAt: string;
  durationMs: number;
  fetched: number;
  pages: number;
  unknown: number;
  cursorFrom: string | null;
  cursorTo: string | null;
  outcome: string | null;
}
