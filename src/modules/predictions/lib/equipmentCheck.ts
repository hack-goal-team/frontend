import type { RiskLevel } from "../types";

/**
 * «К проверке» у отказов — riskLevel HIGH: у вида EQUIPMENT бэк отдаёт его двоично по своему
 * фиксированному порогу (MEDIUM не бывает). Слова «Высокий»/«Низкий» для отказов не выводим.
 */
export function needsEquipmentCheck(level: RiskLevel): boolean {
  return level === "HIGH";
}
