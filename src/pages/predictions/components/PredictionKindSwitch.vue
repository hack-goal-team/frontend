<script setup lang="ts">
import { computed } from "vue";
import { KIND_HINT, KIND_LABEL } from "@/modules/predictions/consts";
import type { JournalKind } from "@/modules/predictions/types";

// Счётчик вкладки — `X-Total-Count` при тех же фильтрах; пока его нет, число не рисуем.
const props = defineProps<{
  counts: Partial<Record<JournalKind, number>>;
  disable: boolean;
}>();

const kind = defineModel<JournalKind>({ required: true });

const options = computed(() =>
  (Object.keys(KIND_LABEL) as JournalKind[]).map((value) => {
    const count = props.counts[value];
    const label = count === undefined ? KIND_LABEL[value] : `${KIND_LABEL[value]} · ${count}`;
    return { value, label, hint: KIND_HINT[value] };
  }),
);
</script>

<template>
  <el-segmented v-model="kind" :options="options" :disabled="disable" class="prediction-kind-switch">
    <template #default="{ item }">
      <el-tooltip v-if="item.hint" :content="item.hint" placement="top">
        <span>{{ item.label }}</span>
      </el-tooltip>
      <span v-else>{{ item.label }}</span>
    </template>
  </el-segmented>
</template>

<style scoped>
.prediction-kind-switch {
  align-self: flex-start;
}
</style>
