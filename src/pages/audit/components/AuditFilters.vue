<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter, type LocationQueryRaw } from "vue-router";
import { AUDIT_ACTION_PATTERN, AUDIT_ACTIONS, AUDIT_CATEGORIES } from "@/modules/audit/consts";
import { PERIOD_SHORTCUTS } from "@/shared/lib/date";

const route = useRoute();
const router = useRouter();

/** Логины с уже загруженных страниц журнала — варианты для фильтра «Пользователь». */
const props = withDefaults(defineProps<{ actors?: string[] }>(), { actors: () => [] });

/**
 * Период — `[from, to)` по контракту. `Z` в value-format даёт ISO с локальным смещением
 * (`…+03:00`) — на бэк оно уходит уже заэкранированным (`%2B`), иначе `+` станет пробелом и 400.
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
  // Контракт: логин — точное совпадение, поэтому селект с вариантами из журнала,
  // а ручной ввод (allow-create) остаётся — виденных страниц может не хватить.
  get: () => (route.query.actor as string) ?? "",
  set: (v) => update({ actor: v.trim() || undefined }),
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
  set: (v) => {
    const codes = normalizeActions(v);
    update({ action: codes.length > 0 ? codes : undefined });
  },
});

/**
 * Набор действий открытый, но код ограничен паттерном контракта: приводим ручной ввод
 * к верхнему регистру и выбрасываем всё, что бэк не принял бы (400 на `login failed`).
 */
function normalizeActions(values: string[]): string[] {
  const codes = values.map((v) => v.trim().toUpperCase()).filter((v) => AUDIT_ACTION_PATTERN.test(v));
  return [...new Set(codes)];
}

function update(patch: LocationQueryRaw) {
  router.replace({
    query: { ...route.query, ...patch, offset: 0 }, // сброс пагинации при смене фильтра
  });
}

function reset() {
  router.replace({ query: {} });
}
</script>

<template>
  <el-form :inline="true" class="audit-filters">
    <el-form-item label="Период">
      <el-date-picker
        v-model="period"
        type="datetimerange"
        value-format="YYYY-MM-DDTHH:mm:ssZ"
        :shortcuts="PERIOD_SHORTCUTS"
        start-placeholder="С"
        end-placeholder="По"
        style="min-width: 340px"
      />
    </el-form-item>

    <el-form-item label="Пользователь">
      <el-select
        v-model="actor"
        clearable
        filterable
        allow-create
        default-first-option
        placeholder="Все"
        style="min-width: 190px"
      >
        <el-option v-for="a in props.actors" :key="a" :label="a" :value="a" />
      </el-select>
    </el-form-item>

    <el-form-item label="Категория">
      <el-select v-model="category" clearable placeholder="Все" style="min-width: 190px">
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
