export const INCIDENT_TYPE_LABELS: Record<string, string> = {
  FLOODING: "Подтопление",
  OVERHEAT: "Перегрев",
  FAILURE: "Отказ оборудования",
  PRESSURE_DROP: "Падение давления",
  LEAK: "Утечка",
  POWER_OUTAGE: "Отключение питания",
};

export function incidentTypeLabel(code: string): string {
  return INCIDENT_TYPE_LABELS[code] ?? code;
}
