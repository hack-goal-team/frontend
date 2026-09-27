<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/modules/audit/consts";

const route = useRoute();
const router = useRouter();

/**
 * Период — `[from, to)` по контракту. `Z` в value-format даёт ISO с локальной зоной
 * (dayjs-токен), Date.parse на бэке такой принимает.
 */
const period = computed({
  get: (): [string, string] | null => {
    const from = route.query.from as string | undefined;
    const to = route.query.to as string | undefined;
    return from && to ? [from, to] : null;
  },
  set: (v) => update({ from: v?.[0], to: v?.[1] }),
});

const actor = computed({
  get: () => (route.query.actor as string) ?? "",
  set: (v) => update({ actor: v || undefined }),
});

const category = computed({
  get: () => (route.query.category as string) ?? "",
  set: (v) => update({ category: v || undefined }),
});

const action = computed<string[]>({
  get: () => {
    const raw = route.query.action;
    if (Array.isArray(raw)) return raw.filter((v): v is string => typeof v === "string");
    return typeof raw === "string" ? [raw] : [];
  },
  set: (v) => update({ action: v.length > 0 ? v : undefined }),
});

function update(patch: LocationQueryRaw) {
  router.replace({
    query: { ...route.query, ...patch, offset: 0 }, // сброс пагинации при смене фильтра
  });
}

function reset() {
  router.replace({ query: {} });
}

const shortcuts = [
  {
    text: "Сутки",
    value: () => [new Date(Date.now() - 24 * 60 * 60 * 1000), new Date()] as [Date, Date],
  },
  {
    text: "Неделя",
    value: () => [new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()] as [Date, Date],
  },
];
</script>

<template>
  <el-form :inline="true" class="audit-filters">
    <el-form-item label="Период">
      <el-date-picker
        v-model="period"
        type="datetimerange"
        value-format="YYYY-MM-DDTHH:mm:ssZ"
        :shortcuts="shortcuts"
        start-placeholder="С"
        end-placeholder="По"
        style="min-width: 340px"
      />
    </el-form-item>

    <el-form-item label="Пользователь">
      <el-input v-model="actor" clearable placeholder="Все" style="min-width: 160px" />
    </el-form-item>

    <el-form-item label="Категория">
      <el-select v-model="category" clearable filterable allow-create placeholder="Все" style="min-width: 170px">
        <el-option v-for="c in AUDIT_CATEGORIES" :key="c" :label="c" :value="c" />
      </el-select>
    </el-form-item>

    <el-form-item label="Действие">
      <el-select
        v-model="action"
        multiple
        clearable
        filterable
        allow-create
        default-first-option
        placeholder="Все"
        style="min-width: 220px"
      >
        <el-option v-for="a in AUDIT_ACTIONS" :key="a" :label="a" :value="a" />
      </el-select>
    </el-form-item>

    <el-form-item>
      <el-button @click="reset">Сбросить</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped>
.audit-filters {
  padding-block: 8px;
  display: flex;
  flex-direction: row;
  gap: 16px;
}

.audit-filters :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}
</style>
