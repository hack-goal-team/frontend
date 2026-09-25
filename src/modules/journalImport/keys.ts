export const journalImportKeys = {
  all: ["journal-import"] as const,
  job: (jobId: string) => [...journalImportKeys.all, "job", jobId] as const,
};
