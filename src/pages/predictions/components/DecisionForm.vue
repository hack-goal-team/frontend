<script setup lang="ts">
import { computed, ref } from "vue";
import { isAxiosError } from "axios";
import { ElMessage } from "element-plus";
import { PERMISSIONS } from "@/modules/auth/consts";
import { useAuthStore } from "@/modules/auth/store";
import { useCreateDecision } from "@/modules/predictions/composables/useCreateDecision";
import { useReferenceStore } from "@/modules/reference/store";
import type { PredictionKind } from "@/modules/predictions/types";
import type { Problem } from "@/shared/api/types";
import "element-plus/theme-chalk/el-message.css";

// Для отказа подсказываем причину ТО, но не предвыбираем: решение за диспетчером (ТЗ :231).
const props = defineProps<{
  predictionId: string;
  kind?: PredictionKind;
}>();

const auth = useAuthStore();
const reference = useReferenceStore();
const mutation = useCreateDecision();

const reasons = computed(() => reference.data?.reasons ?? []);
const maintenanceReason = computed(() => reasons.value.find((r) => r.code === "MAINTENANCE_REQUESTED") ?? null);

const reasonCode = ref<string | null>(null);
const comment = ref("");

const selectedReason = computed(() => reasons.value.find((r) => r.code === reasonCode.value) ?? null);
const commentRequired = computed(() => selectedReason.value?.commentRequired === true);
const canSubmit = computed(
  () => reasonCode.value !== null && (!commentRequired.value || comment.value.trim().length > 0),
);
const submitting = computed(() => mutation.isPending.value);

// requestId живёт до успешного ответа: повтор запроса с тем же id и телом идемпотентен на бэке
const pendingRequestId = ref(crypto.randomUUID());

function submit() {
  if (!canSubmit.value) return;

  mutation.mutate(
    {
      requestId: pendingRequestId.value,
      // target.type пока один — PREDICTION; когда в /reference-data появится справочник типов, брать оттуда
      target: { type: "PREDICTION", predictionId: props.predictionId },
      reasonCode: reasonCode.value!,
      comment: comment.value.trim() || null,
    },
    {
      onSuccess: () => {
        pendingRequestId.value = crypto.randomUUID();
        reasonCode.value = null;
        comment.value = "";
        ElMessage.success("Решение зафиксировано");
      },
      onError: (error) => {
        ElMessage.error(problemTitle(error));
      },
    },
  );
}

function problemTitle(error: Error): string {
  if (isAxiosError<Problem>(error)) {
    return error.response?.data?.title ?? error.message;
  }
  return "Не удалось зафиксировать решение";
}
</script>

<template>
  <section v-if="auth.hasPermission(PERMISSIONS.DECISION_CREATE)" class="decision-form">
    <h3 class="decision-form__title">Решение</h3>

    <el-form label-position="top" @submit.prevent="submit">
      <el-form-item label="Причина" required>
        <el-select
          v-model="reasonCode"
          class="decision-form__select"
          placeholder="Выберите из справочника"
          :disabled="submitting"
        >
          <el-option v-for="r in reasons" :key="r.code" :label="r.description" :value="r.code" />
        </el-select>
        <p v-if="kind === 'EQUIPMENT' && maintenanceReason" class="decision-form__hint">
          Для прогноза отказа обычно выбирают «{{ maintenanceReason.description }}»
        </p>
      </el-form-item>

      <el-form-item label="Комментарий" :required="commentRequired">
        <el-input v-model="comment" type="textarea" :rows="3" maxlength="4000" :disabled="submitting" />
      </el-form-item>

      <div class="decision-form__actions">
        <el-button type="primary" native-type="submit" :loading="submitting" :disabled="!canSubmit">
          Зафиксировать
        </el-button>
      </div>
    </el-form>
  </section>
</template>

<style scoped>
.decision-form {
  /* та же обводка, что у блока «Прогноз» (el-descriptions border) */
  border: 1px solid var(--el-border-color-lighter);
  padding: 12px;
}

.decision-form__title {
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.decision-form__select {
  width: 100%;
}

.decision-form__hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.decision-form__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
