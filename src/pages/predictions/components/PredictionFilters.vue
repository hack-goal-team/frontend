<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useReferenceStore } from "@/modules/reference/store";

const route = useRoute();
const router = useRouter();
const reference = useReferenceStore();

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

defineProps<{ disable: boolean }>();
</script>

<template>
  <el-form :disabled="disable" :inline="true" class="prediction-filters">
    <el-form-item label="Статус">
      <el-select v-model="status" clearable placeholder="Все" style="min-width: 160px">
        <el-option
          v-for="s in reference.data?.predictionStatuses ?? []"
          :key="s.code"
          :label="s.description"
          :value="s.code"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="Мин. вероятность">
      <el-slider v-model="minProbability" :min="0" :max="1" :step="0.05" style="min-width: 200px" />
    </el-form-item>

    <el-form-item>
      <el-checkbox v-model="activeOnly">Только активные</el-checkbox>
    </el-form-item>

    <el-form-item>
      <el-button @click="reset">Сбросить</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.prediction-filters {
  padding-block: 8px;
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.prediction-filters :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}
</style>
