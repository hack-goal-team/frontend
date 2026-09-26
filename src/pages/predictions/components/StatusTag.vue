<script setup lang="ts">
import { STATUS_TAG_TYPE } from "@/modules/predictions/consts";
import { useLabels } from "@/modules/reference/composables/useLabels";

// `status` — строка: бэк добавляет коды (COVERED) без релиза фронта,
// подпись берём из справочника, цвет — локальная таблица с фолбэком.
defineProps<{
  status: string;
}>();

const { statusLabel } = useLabels();
</script>

<template>
  <el-tag :type="STATUS_TAG_TYPE[status] ?? 'info'">
    {{ statusLabel(status) }}
  </el-tag>
</template>
