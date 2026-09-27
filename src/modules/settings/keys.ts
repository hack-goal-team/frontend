export const settingsKeys = {
  all: ["settings"] as const,
  view: () => [...settingsKeys.all, "view"] as const,
};
