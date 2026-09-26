<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useDebounceFn } from "@vueuse/core";
import { Search } from "@element-plus/icons-vue";
import { RISK_OPTIONS } from "@/modules/predictions/consts";
import { LEVEL_OPTIONS, NO_PREDICTIONS_LABEL, NO_RISK_FILTER_VALUE } from "@/modules/objects/consts";
import type { HierarchyLevel } from "@/modules/objects/types";

/**
 * Всё состояние фильтров живёт в URL (`/objects?level=&risk=&q=`), поэтому присланная ссылка
 * открывает экран готовым, а состояние страницы не разъезжается с кэшем реестра.
 * Единственный локальный ref — буфер текстового ввода: он только откладывает запись в URL
 * (по одному replace на паузу набора), источником истины остаётся route.query.
 */
defineProps<{
  disable: boolean;
}>();

const route = useRoute();
const router = useRouter();

const level = computed<HierarchyLevel | "">({
  get: () => {
    const raw = Number(route.query.level);
    return raw === 1 || raw === 2 || raw === 3 ? raw : "";
  },
  set: (value) => update({ level: value || undefined }),
});

const risk = computed<string>({
  get: () => (route.query.risk as string) ?? "",
  set: (value) => update({ risk: value || undefined }),
});

const search = ref((route.query.q as string) ?? "");

const pushSearch = useDebounceFn((value: string) => {
  const next = value.trim();
  const current = (route.query.q as string) ?? "";
  if (current === next) return;
  update({ q: next || undefined });
}, 250);

watch(search, (value) => pushSearch(value));

// Назад/вперёд и внешняя ссылка меняют query мимо ввода — буфер должен подтянуться.
watch(
  () => route.query.q,
  (value) => {
    const next = (value as string) ?? "";
    if (next !== search.value) search.value = next;
  },
);

/**
 * Единственная точка записи состояния. Пустое значение уходит из URL целиком,
 * а не остаётся как `?q=` — иначе присланная ссылка содержит мусор.
 */
function update(patch: Record<string, string | number | null | undefined>) {
  const query: Record<string, string> = {};
  for (const [key, value] of Object.entries({ ...route.query, ...patch })) {
    if (value === null || value === undefined || value === "") continue;
    query[key] = String(Array.isArray(value) ? (value[0] ?? "") : value);
  }
  router.replace({ query });
}

function reset() {
  search.value = "";
  router.replace({ query: {} });
}

// Риск серверный (`withRisk=true`), поэтому фильтр работает всегда. Значение шире RiskLevel —
// NONE кода риска в контракте нет, это договорённость фронта с самим собой: «без прогноза»
// соответствует серверному `riskLevel: null`, а не «мы не знаем».
const riskOptions: { value: string; label: string }[] = [
  ...RISK_OPTIONS.map((option) => ({ ...option })),
  { value: NO_RISK_FILTER_VALUE, label: NO_PREDICTIONS_LABEL },
];
</script>

<template>
  <el-form :disabled="disable" :inline="true" class="objects-filters">
    <el-form-item label="Уровень">
      <el-select v-model="level" clearable placeholder="Все" style="min-width: 160px">
        <el-option v-for="option in LEVEL_OPTIONS" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
    </el-form-item>

    <el-form-item label="Риск">
      <el-select v-model="risk" clearable placeholder="Все" style="min-width: 160px">
        <el-option v-for="option in riskOptions" :key="option.value" :label="option.label" :value="option.value" />
      </el-select>
    </el-form-item>

    <el-form-item label="Поиск">
      <el-input
        v-model="search"
        :prefix-icon="Search"
        clearable
        placeholder="Название или ID"
        style="min-width: 240px"
      />
    </el-form-item>

    <el-form-item>
      <el-button @click="reset">Сбросить</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.objects-filters {
  padding-block: 8px;
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.objects-filters :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}
</style>
