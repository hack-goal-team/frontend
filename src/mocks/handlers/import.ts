import { http, HttpResponse } from "msw";
import type { ImportJob } from "@/modules/journalImport/types";
import { getCurrentUser } from "../state/auth";
import { mockDelay } from "../utils/delay";
import { problem } from "../utils/problem";

const BASE = "/api/v1/admin/import/journal";

/** Активные задачи импорта — живут до перезагрузки страницы. */
const jobs = new Map<string, ImportJob>();

let nextJobId = 1;

export const importHandlers = [
  http.post(BASE, async ({ request }) => {
    await mockDelay(400, 1200);

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return problem(400, "Bad Request", "file is required");
    }

    if (!/\.(csv|xlsx)$/i.test(file.name)) {
      return problem(415, "Unsupported Media Type", "Допустимы только файлы CSV и XLSX");
    }

    const jobId = String(nextJobId++);
    const job: ImportJob = {
      jobId,
      status: "QUEUED",
      fileName: file.name,
      rowsRead: null,
      rowsStored: null,
      duplicates: null,
      unknownChannels: null,
      error: null,
      failedLine: null,
      failedEventId: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      finishedAt: null,
      user: getCurrentUser()?.username ?? null,
    };
    jobs.set(jobId, job);

    scheduleRun(jobId, file.name);

    return HttpResponse.json(job);
  }),

  http.get(`${BASE}/:jobId`, async ({ params }) => {
    await mockDelay(200, 600);

    const job = jobs.get(String(params.jobId));

    if (!job) {
      return problem(404, "Not Found", `Задача импорта ${params.jobId} не найдена`);
    }

    return HttpResponse.json(job);
  }),
];

function scheduleRun(jobId: string, fileName: string) {
  const job = jobs.get(jobId) as ImportJob;
  // Имя файла с «fail» — сценарий ошибки разбора для проверки экрана.
  const fails = /fail/i.test(fileName);

  setTimeout(() => {
    job.status = "RUNNING";
    job.startedAt = new Date().toISOString();
  }, 800);

  setTimeout(() => {
    const rowsRead = 200 + Math.floor(Math.random() * 800);
    const duplicates = Math.floor(Math.random() * 30);
    const unknownChannels = Math.floor(Math.random() * 15);

    job.rowsRead = rowsRead;

    if (fails) {
      job.status = "FAILED";
      job.error = "Не удалось разобрать строку файла";
      job.failedLine = 1 + Math.floor(Math.random() * rowsRead);
      job.failedEventId = String(100_000 + Math.floor(Math.random() * 900_000));
    } else {
      job.status = "SUCCEEDED";
      job.rowsStored = rowsRead - duplicates - unknownChannels;
      job.duplicates = duplicates;
      job.unknownChannels = unknownChannels;
    }

    job.finishedAt = new Date().toISOString();
  }, 3000);
}
