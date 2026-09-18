// "3 прогноза" / "5 прогнозов" / "1 прогноз"
export function pluralize(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "прогноз";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "прогноза";
  return "прогнозов";
}
