<script setup lang="ts">
import { computed } from "vue";
import { KIND_LABEL } from "@/modules/predictions/consts";
import type { PredictionKind } from "@/modules/predictions/types";

// Счётчик вкладки — `X-Total-Count` при тех же фильтрах; пока его нет, число не рисуем.
const props = defineProps<{
  counts: Partial<Record<PredictionKind, number>>;
  disable: boolean;
}>();

const kind = defineModel<PredictionKind>({ required: true });

const options = computed(() =>
  (Object.keys(KIND_LABEL) as PredictionKind[]).map((value) => {
    const count = props.counts[value];
    return { value, label: count === undefined ? KIND_LABEL[value] : `${KIND_LABEL[value]} · ${count}` };
  }),
);
</script>

<template>
  <el-segmented v-model="kind" :options="options" :disabled="disable" class="prediction-kind-switch" />
</template>

<style scoped>
.prediction-kind-switch {
  align-self: flex-start;
}
</style>
