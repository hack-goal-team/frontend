<script setup lang="ts">
import { LEVEL_LABEL } from "@/modules/objects/consts";
import type { HierarchyLevel } from "@/modules/objects/types";

defineProps<{ level: HierarchyLevel }>();

/** Цвет только про глубину иерархии, про риск — соседняя колонка. */
const LEVEL_TAG_TYPE: Record<HierarchyLevel, "primary" | "info" | "success"> = {
  1: "primary",
  2: "info",
  3: "success",
};
</script>

<template>
  <el-tag :type="LEVEL_TAG_TYPE[level]" size="small" effect="light">
    {{ LEVEL_LABEL[level] }}
  </el-tag>
</template>
