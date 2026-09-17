<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useReferenceStore } from "@/modules/reference/store";

const route = useRoute();
const router = useRouter();
const reference = useReferenceStore();

onMounted(() => reference.load());

const incidentType = computed({
  get: () => (route.query.incidentType as string) ?? "",
  set: (v) => update({ incidentType: v || undefined }),
});

const status = computed({
  get: () => (route.query.status as string) ?? "",
  set: (v) => update({ status: v || undefined }),
});

const minProbability = computed({
  get: () => Number(route.query.minProbability ?? 0),
  set: (v) => update({ minProbability: v > 0 ? v : undefined }),
});

const activeOnly = computed({
  get: () => route.query.activeOnly === "true",
  set: (v) => update({ activeOnly: v ? true : undefined }),
});

function update(patch: Record<string, unknown>) {
  router.replace({
    query: {
      ...route.query,
      ...patch,
      offset: 0, // сброс пагинации при смене фильтра
    },
  });
}

function reset() {
  router.replace({ query: {} });
}
</script>

<template>
  <el-form :inline="true" class="prediction-filters">
    <el-form-item label="Тип инцидента">
      <el-select v-model="incidentType" clearable placeholder="Все" style="width: 200px">
        <el-option v-for="t in reference.data?.incidentTypes ?? []" :key="t" :label="t" :value="t" />
      </el-select>
    </el-form-item>

    <el-form-item label="Статус">
      <el-select v-model="status" clearable placeholder="Все" style="width: 160px">
        <el-option v-for="s in reference.data?.predictionStatuses ?? []" :key="s" :label="s" :value="s" />
      </el-select>
    </el-form-item>

    <el-form-item label="Мин. вероятность">
      <el-slider v-model="minProbability" :min="0" :max="1" :step="0.05" style="width: 200px" />
    </el-form-item>

    <el-form-item>
      <el-checkbox v-model="activeOnly">Только активные</el-checkbox>
    </el-form-item>

    <el-form-item>
      <el-button @click="reset">Сбросить</el-button>
    </el-form-item>
  </el-form>
</template>

<style>
.prediction-filters {
  padding-block: 15px;
}
</style>
