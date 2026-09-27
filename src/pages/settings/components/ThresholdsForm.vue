<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { isAxiosError } from "axios";
import { ElMessage } from "element-plus";
import type { FormInstance, FormItemRule, FormRules } from "element-plus";
import { useSettingsQuery } from "@/modules/settings/composables/useSettingsQuery";
import { useUpdateSettings } from "@/modules/settings/composables/useUpdateSettings";
import type { Problem } from "@/shared/api/types";
import { formatDateTime } from "@/shared/lib/date";
import "element-plus/theme-chalk/el-message.css";

const { data: settings, isLoading, isError, refetch } = useSettingsQuery();
const updateMutation = useUpdateSettings();

// Пороги в форме — проценты, контракт хранит вероятность 0…1
const form = reactive({
  decisionCoverHours: 1,
  sensorFreshHours: 72,
  riskMediumPercent: 40,
  riskHighPercent: 70,
});

watch(
  settings,
  (value) => {
    if (!value) return;
    form.decisionCoverHours = value.decisionCoverHours;
    form.sensorFreshHours = value.sensorFreshHours;
    form.riskMediumPercent = Math.round(value.riskMedium * 100);
    form.riskHighPercent = Math.round(value.riskHigh * 100);
  },
  { immediate: true },
);

const formRef = ref<FormInstance>();
const saving = ref(false);
const saveError = ref<string | null>(null);

const validateHighThreshold: FormItemRule["validator"] = (_rule, value, callback) => {
  if (value == null) {
    callback(new Error("Укажите порог HIGH"));
  } else if (value <= form.riskMediumPercent) {
    callback(new Error("Порог HIGH должен быть выше порога MEDIUM"));
  } else {
    callback();
  }
};

const rules: FormRules = {
  decisionCoverHours: [{ required: true, message: "Укажите срок действия решения", trigger: "change" }],
  sensorFreshHours: [{ required: true, message: "Укажите окно свежести показания", trigger: "change" }],
  riskMediumPercent: [{ required: true, message: "Укажите порог MEDIUM", trigger: "change" }],
  riskHighPercent: [{ validator: validateHighThreshold, trigger: "change" }],
};

async function onSave() {
  saveError.value = null;
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return;

  saving.value = true;
  try {
    await updateMutation.mutateAsync({
      decisionCoverHours: Number(form.decisionCoverHours),
      sensorFreshHours: Number(form.sensorFreshHours),
      riskMedium: Number(form.riskMediumPercent) / 100,
      riskHigh: Number(form.riskHighPercent) / 100,
    });
    ElMessage.success("Параметры сохранены");
  } catch (error) {
    saveError.value = problemDetail(error);
  } finally {
    saving.value = false;
  }
}

function problemDetail(error: unknown): string {
  if (isAxiosError<Problem>(error)) {
    return error.response?.data?.detail ?? error.response?.data?.title ?? "Не удалось сохранить параметры";
  }
  return "Не удалось сохранить параметры";
}
</script>

<template>
  <el-card v-loading="isLoading" shadow="never">
    <template #header>
      <span>Параметры прогноза</span>
    </template>

    <el-alert
      v-if="isError"
      type="error"
      :closable="false"
      show-icon
      title="Не удалось загрузить параметры"
      class="thresholds-form__load-error"
    >
      <el-button link type="primary" @click="refetch()">Повторить</el-button>
    </el-alert>

    <el-form
      v-else
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="thresholds-form__form"
      @submit.prevent="onSave"
    >
      <div class="thresholds-form__grid">
        <el-form-item label="Срок действия решения, ч" prop="decisionCoverHours">
          <el-input-number v-model="form.decisionCoverHours" :min="1" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Окно свежести показания, ч" prop="sensorFreshHours">
          <el-input-number v-model="form.sensorFreshHours" :min="1" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Порог MEDIUM, %" prop="riskMediumPercent">
          <el-input-number v-model="form.riskMediumPercent" :min="0" :max="100" :disabled="saving" />
        </el-form-item>
        <el-form-item label="Порог HIGH, %" prop="riskHighPercent">
          <el-input-number v-model="form.riskHighPercent" :min="0" :max="100" :disabled="saving" />
        </el-form-item>
      </div>

      <el-alert
        v-if="saveError"
        type="error"
        :closable="false"
        show-icon
        :title="saveError"
        class="thresholds-form__save-error"
      />

      <div class="thresholds-form__actions">
        <el-button type="primary" native-type="submit" :loading="saving">Сохранить</el-button>
      </div>
    </el-form>

    <div v-if="settings" class="thresholds-form__meta">
      <span>Горизонт прогноза: {{ settings.predictionHorizonHours }} ч</span>
      <span v-if="settings.updatedAt">
        Изменено: {{ formatDateTime(settings.updatedAt)
        }}<template v-if="settings.updatedBy"> — {{ settings.updatedBy }}</template>
      </span>
    </div>
  </el-card>
</template>

<style scoped>
/* Тело карточки — flex-колонка, форма занимает всю высоту,
   действия и мета прижаты к низу */
:deep(.el-card__body) {
  display: flex;
  flex-direction: column;
}

.thresholds-form__form {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.thresholds-form__grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  column-gap: 16px;
}

.thresholds-form__grid :deep(.el-input-number) {
  width: 100%;
}

.thresholds-form__grid :deep(.el-form-item__label) {
  white-space: nowrap;
}

.thresholds-form__grid :deep(.el-form-item__content) {
  min-width: 0;
}

.thresholds-form__load-error,
.thresholds-form__save-error {
  margin-bottom: 16px;
}

.thresholds-form__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
  padding-top: 16px;
}

.thresholds-form__meta {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
  justify-content: flex-end;
}
</style>
