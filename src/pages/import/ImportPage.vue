<script setup lang="ts">
import { computed, ref } from "vue";
import { isAxiosError } from "axios";
import { ElMessage } from "element-plus";
import type { UploadFile, UploadInstance } from "element-plus";
import { Delete, Document, UploadFilled } from "@element-plus/icons-vue";
import { uploadJournalFile } from "@/modules/journalImport/api";
import { useImportJobQuery } from "@/modules/journalImport/composables/useImportJobQuery";
import { IMPORT_FILE_ACCEPT, IMPORT_JOB_STATUS_LABEL, IMPORT_JOB_STATUS_TAG } from "@/modules/journalImport/consts";
import type { Problem } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/date";
import "element-plus/theme-chalk/el-message.css";

const uploadRef = ref<UploadInstance>();
const selectedFile = ref<File | null>(null);
const uploading = ref(false);
const uploadPercent = ref(0);
const jobId = ref<string | null>(null);

const { data: job, isError: jobError } = useImportJobQuery(jobId);

const jobActive = computed(() => job.value?.status === "QUEUED" || job.value?.status === "RUNNING");
const uploadDisabled = computed(() => uploading.value || jobActive.value);

function onFileChange(uploadFile: UploadFile) {
  selectedFile.value = uploadFile.raw ?? null;
}

function onFileExceed() {
  ElMessage.warning("Выберите один файл: сначала уберите текущий");
}

function clearFile() {
  selectedFile.value = null;
  uploadRef.value?.clearFiles();
}

async function startUpload() {
  const file = selectedFile.value;
  if (!file || uploading.value) return;

  uploading.value = true;
  uploadPercent.value = 0;

  try {
    const created = await uploadJournalFile(file, (percent) => {
      uploadPercent.value = percent;
    });
    jobId.value = created.jobId;
    clearFile();
  } catch (error) {
    ElMessage.error(problemTitle(error));
  } finally {
    uploading.value = false;
  }
}

function problemTitle(error: unknown): string {
  if (isAxiosError<Problem>(error)) {
    return error.response?.data?.title ?? error.message;
  }
  return "Не удалось отправить файл";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Импорт журналов сработок</span>
  </Teleport>

  <div class="import-page">
    <el-card shadow="never">
      <template #header>
        <span>Загрузка файла</span>
      </template>

      <el-upload
        ref="uploadRef"
        drag
        class="import-page__upload"
        :accept="IMPORT_FILE_ACCEPT"
        :auto-upload="false"
        :show-file-list="false"
        :limit="1"
        :disabled="uploadDisabled"
        :on-change="onFileChange"
        :on-exceed="onFileExceed"
      >
        <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
        <div class="el-upload__text">Перетащите файл сюда или <em>нажмите для выбора</em></div>
        <template #tip>
          <div class="el-upload__tip">CSV или XLSX с историей сработок</div>
        </template>
      </el-upload>

      <div v-if="selectedFile" class="import-page__file">
        <el-icon class="import-page__file-icon"><Document /></el-icon>
        <span class="import-page__file-name">{{ selectedFile.name }}</span>
        <span class="import-page__file-size">{{ formatBytes(selectedFile.size) }}</span>
        <el-button link type="danger" :icon="Delete" aria-label="Убрать файл" @click="clearFile" />
      </div>

      <div class="import-page__actions">
        <el-button type="primary" :disabled="!selectedFile || uploadDisabled" :loading="uploading" @click="startUpload">
          Загрузить
        </el-button>
      </div>

      <el-progress
        v-if="uploading"
        class="import-page__progress"
        :percentage="uploadPercent"
        :indeterminate="uploadPercent === 0"
        :duration="1"
      />
    </el-card>

    <el-card v-if="job" shadow="never">
      <template #header>
        <span>Результат импорта</span>
      </template>

      <div class="import-page__job-header">
        <el-tag :type="IMPORT_JOB_STATUS_TAG[job.status]" effect="light">
          {{ IMPORT_JOB_STATUS_LABEL[job.status] }}
        </el-tag>
        <span class="import-page__job-file">{{ job.fileName }}</span>
      </div>

      <p v-if="jobActive" class="import-page__job-hint">Импорт выполняется, статус обновляется автоматически.</p>

      <el-alert
        v-if="job.status === 'FAILED'"
        class="import-page__job-error"
        type="error"
        :closable="false"
        show-icon
        :title="job.error ?? 'Неизвестная ошибка импорта'"
      >
        <template v-if="job.failedLine || job.failedEventId" #default>
          Строка файла: {{ job.failedLine ?? "—"
          }}<span v-if="job.failedEventId"> · ID события: {{ job.failedEventId }}</span>
        </template>
      </el-alert>

      <el-alert
        v-else-if="jobError"
        class="import-page__job-error"
        type="warning"
        :closable="false"
        show-icon
        title="Не удалось получить статус задачи"
      />

      <el-descriptions :column="2" border>
        <el-descriptions-item label="Прочитано строк">{{ job.rowsRead ?? "—" }}</el-descriptions-item>
        <el-descriptions-item label="Сохранено строк">{{ job.rowsStored ?? "—" }}</el-descriptions-item>
        <el-descriptions-item label="Дубликаты">{{ job.duplicates ?? "—" }}</el-descriptions-item>
        <el-descriptions-item label="Неизвестные каналы">{{ job.unknownChannels ?? "—" }}</el-descriptions-item>
        <el-descriptions-item label="Начало">{{
          job.startedAt ? formatDateTime(job.startedAt) : "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="Завершение">{{
          job.finishedAt ? formatDateTime(job.finishedAt) : "—"
        }}</el-descriptions-item>
        <el-descriptions-item label="Пользователь">{{ job.user ?? "—" }}</el-descriptions-item>
      </el-descriptions>
    </el-card>
  </div>
</template>

<style scoped>
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.import-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.import-page__upload {
  width: 100%;
}

.import-page__file {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 8px 12px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  font-size: 13px;
}

.import-page__file-icon {
  color: var(--el-text-color-secondary);
}

.import-page__file-name {
  color: var(--el-text-color-primary);
}

.import-page__file-size {
  color: var(--el-text-color-placeholder);
}

.import-page__file .el-button {
  margin-left: auto;
}

.import-page__actions {
  margin-top: 16px;
}

.import-page__progress {
  margin-top: 12px;
}

.import-page__job-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.import-page__job-file {
  font-size: 13px;
  color: var(--el-text-color-regular);
}

.import-page__job-hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.import-page__job-error {
  margin-top: 12px;
}
</style>
