export type ImportJobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED";

export interface ImportJob {
  jobId: string;
  status: ImportJobStatus;
  fileName: string;
  rowsRead: number | null;
  rowsStored: number | null;
  duplicates: number | null;
  unknownChannels: number | null;
  error: string | null;
  failedLine: number | null;
  failedEventId: string | null;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  user: string | null;
}
