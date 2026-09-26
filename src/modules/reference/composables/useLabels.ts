import { useReferenceStore } from "../store";
import { findCodeLabel } from "../lib/labels";

/**
 * Подписи к кодам приходят справочником `/reference-data`, поэтому словарь держим
 * один — справочник. Своя таблица подписей на фронте расходится с бэком при первом
 * же изменении кодов (типы инцидентов уже переведены на `code` + `description`).
 */
export function useLabels() {
  const reference = useReferenceStore();

  function reasonLabel(code: string): string {
    return findCodeLabel(reference.data?.reasons, code);
  }

  function incidentTypeLabel(code: string): string {
    return findCodeLabel(reference.data?.incidentTypes, code);
  }

  function statusLabel(code: string): string {
    return findCodeLabel(reference.data?.predictionStatuses, code);
  }

  return { reasonLabel, incidentTypeLabel, statusLabel };
}
