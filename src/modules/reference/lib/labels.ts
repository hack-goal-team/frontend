import type { Code } from "@/shared/api/types";

/**
 * Находит человекочитаемое описание по коду.
 * Если справочник не загружен или код не найден — возвращает сам код.
 */
export function findCodeLabel(codes: Code[] | undefined, code: string): string {
  const found = codes?.find((c) => c.code === code);
  return found?.description ?? code;
}
