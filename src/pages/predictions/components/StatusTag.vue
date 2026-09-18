<script setup lang="ts">
import { STATUS_LABEL, STATUS_TAG_TYPE } from "@/modules/predictions/consts";
import type { PredictionStatus } from "@/modules/predictions/types";

defineProps<{
  status: PredictionStatus;
}>();
</script>

<template>
  <el-tag :type="STATUS_TAG_TYPE[status]">
    {{ STATUS_LABEL[status] }}
  </el-tag>
</template>
