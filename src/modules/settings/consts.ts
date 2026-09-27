export type RefreshTarget = "weather" | "river" | "registry" | "ods";

export interface IntegrationInfo {
  target: RefreshTarget;
  title: string;
  description: string;
}

export const INTEGRATIONS: readonly IntegrationInfo[] = [
  {
    target: "weather",
    title: "Метеослужба",
    description: "Текущая погода и прогноз на 1–2 дня по районам",
  },
  {
    target: "river",
    title: "Уровень Москвы-реки",
    description: "Замер уровня воды на основном посту, раз в сутки около 08:00 МСК",
  },
  {
    target: "registry",
    title: "Реестр каналов и объектов",
    description: "Датчики, объекты и дерево объектов заказчика",
  },
  {
    target: "ods",
    title: "Заявки ОДС",
    description: "Журнал выездов и работ из системы ОДС",
  },
] as const;

export const REFRESH_ERROR = {
  conflict: "Обновление уже выполняется — дождитесь завершения текущего запуска.",
  unavailable: "Внешний источник недоступен или вернул некорректные данные.",
  generic: "Не удалось обновить данные.",
} as const;
