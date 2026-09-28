import type { Code } from "@/shared/api/types";
import { SENSOR_TYPES } from "../data/channels";
import { mockReferenceData } from "../data/reference";

/**
 * Класс инцидента по типу датчика — как бэк собирает `context.incidentClass`: подпись
 * берётся из incidentTypes справочника, у типов вне четырёх классов и у канала вне реестра — null.
 */
export function incidentClassOf(sensorType: string | null | undefined): Code | null {
  const code = SENSOR_TYPES.find((type) => type.code === sensorType)?.incidentClass;
  return mockReferenceData.incidentTypes.find((type) => type.code === code) ?? null;
}
