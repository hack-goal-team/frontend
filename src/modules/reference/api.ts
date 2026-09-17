import { get } from "@/shared/api/http";
import type { ReferenceData } from "./types";

export function fetchReferenceData(): Promise<ReferenceData> {
  return get<ReferenceData>("/reference-data");
}
