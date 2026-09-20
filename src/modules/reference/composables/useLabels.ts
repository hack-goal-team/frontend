import { useReferenceStore } from "../store";
import { findReasonLabel } from "../lib/labels";

export function useLabels() {
  const reference = useReferenceStore();

  function reasonLabel(code: string): string {
    return findReasonLabel(reference.data?.reasons, code);
  }

  return { reasonLabel };
}
