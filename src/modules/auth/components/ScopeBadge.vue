<script setup lang="ts">
import { computed } from "vue";
import { useAuthStore } from "../store";

const auth = useAuthStore();

const text = computed(() => {
  const scope = auth.scope;
  if (!scope) return "";

  if (scope.kind === "ALL") return "Все объекты";
  if (scope.kind === "EMPTY") return "Область не назначена";

  if (scope.names.length === 0) return "";
  if (scope.names.length === 1) return scope.names[0];

  return `${scope.names[0]} +${scope.names.length - 1}`;
});

const title = computed(() => {
  const scope = auth.scope;
  if (!scope) return "";
  return scope.names.join(", ");
});
</script>

<template>
  <el-tag v-if="text" type="info" :title="title">
    {{ text }}
  </el-tag>
</template>
