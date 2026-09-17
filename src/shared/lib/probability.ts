export function formatProbability(value: number): string {
  return `${Math.round(value * 100)}%`;
}
