import { get, http } from "@/shared/api/http";
import type { ImportJob } from "./types";

export function uploadJournalFile(file: File, onProgress: (percent: number) => void): Promise<ImportJob> {
  const form = new FormData();
  form.append("file", file);

  return http
    .post<ImportJob>("/admin/import/journal", form, {
      // Инстанс http держит Content-Type: application/json — с ним axios 1.x
      // превратил бы FormData в JSON. С multipart-заголовком данные уходят как
      // есть, а границу в XHR подставит браузер.
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (event) => {
        if (event.total) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      },
    })
    .then((response) => response.data);
}

export function fetchImportJob(jobId: string): Promise<ImportJob> {
  return get<ImportJob>(`/admin/import/journal/${jobId}`);
}
