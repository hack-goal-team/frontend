<script setup lang="ts">
import { RISK_LABEL, RISK_TAG_TYPE } from "@/modules/predictions/consts";
import type { RiskLevel } from "@/modules/predictions/types";

defineProps<{
  level: RiskLevel;
}>();
</script>

<template>
  <el-tag :type="RISK_TAG_TYPE[level]">
    {{ RISK_LABEL[level] }}
  </el-tag>
</template>
