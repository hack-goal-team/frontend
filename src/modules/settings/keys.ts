export const settingsKeys = {
  all: ["settings"] as const,
  view: () => [...settingsKeys.all, "view"] as const,
};

// Отдельное дерево: /river-level не настройки и к PUT /settings отношения не имеет.
export const riverLevelKeys = {
  all: ["river-level"] as const,
  current: () => [...riverLevelKeys.all, "current"] as const,
};
