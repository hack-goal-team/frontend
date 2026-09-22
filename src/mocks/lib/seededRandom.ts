/**
 * Детерминированный PRNG для моков (mulberry32 — тот же, что в
 * `data/generatePredictions.ts`). Реестру он нужен, чтобы грязные случаи
 * матрицы проверки не менялись от перезагрузки вкладки: рандом на `Math.random`
 * каждый раз рисовал бы другое дерево и сравнить «стало/должно стало» невозможно.
 */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return function () {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makePickers(seed: number) {
  const rand = mulberry32(seed);

  return {
    rand,
    /** Целое включительно от min до max. */
    int: (min: number, max: number): number => Math.floor(rand() * (max - min + 1)) + min,
    pick: <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)],
    chance: (probability: number): boolean => rand() < probability,
  };
}
