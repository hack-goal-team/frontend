import type { ImportJobStatus } from "./types";

export const IMPORT_FILE_ACCEPT = ".csv,.xlsx";

export const IMPORT_JOB_STATUS_LABEL: Record<ImportJobStatus, string> = {
  QUEUED: "В очереди",
  RUNNING: "Импортируется",
  SUCCEEDED: "Завершён",
  FAILED: "Ошибка",
};

export const IMPORT_JOB_STATUS_TAG: Record<ImportJobStatus, "info" | "primary" | "success" | "danger"> = {
  QUEUED: "info",
  RUNNING: "primary",
  SUCCEEDED: "success",
  FAILED: "danger",
};
