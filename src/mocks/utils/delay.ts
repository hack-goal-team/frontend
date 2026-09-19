import { delay } from "msw";

const DEFAULT_MIN = 500;
const DEFAULT_MAX = 2000;

/**
 * Имитирует сетевую задержку.
 * Если VITE_USE_MOCK_DELAY=false — задержки нет.
 */
export async function mockDelay(min = DEFAULT_MIN, max = DEFAULT_MAX) {
  if (import.meta.env.VITE_USE_MOCK_DELAY === "false") return;
  const ms = min + Math.random() * (max - min);
  await delay(ms);
}
