export const predictionKeys = {
  all: ["predictions"] as const,
  list: () => [...predictionKeys.all, "list"] as const,
};
