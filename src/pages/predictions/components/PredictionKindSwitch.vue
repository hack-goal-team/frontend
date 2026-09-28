<script setup lang="ts">
import { InfoFilled } from "@element-plus/icons-vue";
import { KIND_HINT, KIND_LABEL } from "@/modules/predictions/consts";
import type { JournalKind } from "@/modules/predictions/types";

// Без счётчиков: крупное число на несрочной вкладке тянуло бы взгляд не туда, а «Всего N»
// уже есть у пагинации. Пояснение — иконкой рядом: слот внутри el-segmented глотает клик.
defineProps<{ disable: boolean }>();

const kind = defineModel<JournalKind>({ required: true });

const options = (Object.keys(KIND_LABEL) as JournalKind[]).map((value) => ({ value, label: KIND_LABEL[value] }));
</script>

<template>
  <div class="prediction-kind-switch">
    <el-segmented v-model="kind" :options="options" :disabled="disable" />
    <el-tooltip :content="KIND_HINT.EQUIPMENT" placement="right">
      <el-icon class="prediction-kind-switch__hint" aria-label="Что во вкладке «Оборудование»">
        <InfoFilled />
      </el-icon>
    </el-tooltip>
  </div>
</template>

<style scoped>
.prediction-kind-switch {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prediction-kind-switch__hint {
  color: var(--el-text-color-secondary);
  cursor: help;
}
</style>
