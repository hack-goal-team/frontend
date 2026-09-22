import type { RiskLevel, PredictionStatus } from "./types";

// ---- Риск ----

export const RISK_TAG_TYPE: Record<RiskLevel, "success" | "warning" | "danger"> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

export const RISK_LABEL: Record<RiskLevel, string> = {
  LOW: "Низкий",
  MEDIUM: "Средний",
  HIGH: "Высокий",
};

export const RISK_OPTIONS: { value: RiskLevel; label: string }[] = [
  { value: "LOW", label: "Низкий" },
  { value: "MEDIUM", label: "Средний" },
  { value: "HIGH", label: "Высокий" },
];

// ---- Статус ----

export const STATUS_TAG_TYPE: Record<PredictionStatus, "info" | "success"> = {
  NEW: "success",
  REVIEWED: "info",
};

export const STATUS_LABEL: Record<PredictionStatus, string> = {
  NEW: "Новый",
  REVIEWED: "Рассмотрен",
};

// ---- Пагинация ----

export const DEFAULT_LIMIT = 50;
export const DEFAULT_OFFSET = 0;
export const PAGE_SIZE_OPTIONS = [25, 50, 100];
