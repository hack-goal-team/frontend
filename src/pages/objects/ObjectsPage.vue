<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { InfoFilled } from "@element-plus/icons-vue";
import { useAuthStore } from "@/modules/auth/store";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import { collectExpandableKeys, countTreeNodes, filterTree } from "@/modules/objects/lib/tree";
import { objectLabel } from "@/modules/objects/lib/label";
import { useObjectRegistry } from "@/modules/objects/composables/useObjectRegistry";
import { NO_RISK_FILTER_VALUE, OBJECTS_TITLE } from "@/modules/objects/consts";
import type { HierarchyLevel, ObjectTreeNode } from "@/modules/objects/types";
import ObjectsFilters from "./components/ObjectsFilters.vue";
import ObjectsTable from "./components/ObjectsTable.vue";
import ObjectsTableSkeleton from "./components/skeletons/ObjectsTableSkeleton.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const { roots, stats, items, total, riskOf, isLoading, isFetching, isError, error } = useObjectRegistry();

// --- состояние фильтров: только URL, пустое значение => undefined ---

const level = computed<HierarchyLevel | null>(() => {
  const raw = Number(route.query.level);
  return raw === 1 || raw === 2 || raw === 3 ? (raw as HierarchyLevel) : null;
});

const riskFilter = computed<string | null>(() => (route.query.risk as string) || null);
const search = computed(() => ((route.query.q as string) ?? "").trim().toLowerCase());

/**
 * Значение узла для фильтра по риску: уровень — из серверного `risk`, «без прогноза» —
 * утверждение бэка (в бэкенде `riskLevel: null` при активных прогнозах нет).
 * `null` от `riskOf` — поля `risk` в записи нет вовсе, такое в фильтр не попадает.
 */
function filterValueOf(node: ObjectTreeNode): string | null {
  const resolved = riskOf(node);
  if (!resolved) return null;
  return resolved.level ?? NO_RISK_FILTER_VALUE;
}

function matches(node: ObjectTreeNode): boolean {
  if (level.value !== null && node.object.hierarchyLevel !== level.value) return false;

  if (riskFilter.value) {
    const value = filterValueOf(node);
    if (value === null || value !== riskFilter.value) return false;
  }

  if (search.value) {
    const haystack = `${objectLabel(node.object)} ${node.id}`.toLowerCase();
    if (!haystack.includes(search.value)) return false;
  }

  return true;
}

const hasFilter = computed(() => level.value !== null || !!search.value || !!riskFilter.value);

const visibleRoots = computed(() => (hasFilter.value ? filterTree(roots.value, matches) : roots.value));

// Раскрытие выводимо из URL: присланная ссылка открывает экран готовым, локального состояния нет.
const expandedIds = computed(() => collectExpandableKeys(visibleRoots.value));
const shown = computed(() => countTreeNodes(visibleRoots.value));

const isEmpty = computed(() => !isLoading.value && !isError.value && items.value.length === 0);

const statsText = computed(() => {
  const parts = [`записей в выдаче: ${stats.value.received}`, `узлов: ${stats.value.nodes}`];
  if (stats.value.duplicates) parts.push(`дубликатов id: ${stats.value.duplicates}`);
  if (stats.value.detached) parts.push(`без родителя в выдаче: ${stats.value.detached}`);
  if (stats.value.cycles) parts.push(`разорвано циклов: ${stats.value.cycles}`);
  if (stats.value.received !== total.value && total.value !== null) parts.push(`X-Total-Count: ${total.value}`);
  return parts.join(" · ");
});

/** Клик по строке — единственный переход с таблицы; фильтры в URL остаются нетронутыми. */
function openObject(id: string) {
  router.push({ name: "object-graph", params: { id } });
}
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">{{ OBJECTS_TITLE }}</span>
  </Teleport>

  <div class="objects-page">
    <ObjectsFilters :disable="auth.isEmptyScope" class="objects-page__filters" />

    <div class="objects-page__caption">
      <span v-if="hasFilter">Показано {{ shown }} из {{ stats.nodes }}</span>
      <span v-else>Всего узлов: {{ stats.nodes }}</span>
      <el-tooltip :content="statsText" placement="top">
        <el-icon class="objects-page__help"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>

    <el-card
      class="objects-page__table"
      shadow="never"
      :body-style="{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }"
    >
      <EmptyScopeNotice v-if="auth.isEmptyScope" />

      <el-alert
        v-else-if="isError"
        type="error"
        :title="`Ошибка загрузки: ${(error as Error)?.message ?? 'неизвестно'}`"
        :closable="false"
        show-icon
      />

      <ObjectsTableSkeleton v-else-if="isLoading" :rows="25" />

      <el-empty v-else-if="isEmpty" description="Реестр пуст" />

      <ObjectsTable
        v-else
        :items="visibleRoots"
        :risk-of="riskOf"
        :expand-row-keys="expandedIds"
        :loading="isFetching"
        @row-click="openObject"
      />
    </el-card>
  </div>
</template>

<style scoped>
.objects-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.objects-page__filters {
  flex-shrink: 0;
}

.objects-page__caption {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.objects-page__help {
  color: var(--el-text-color-secondary);
}

.objects-page__table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-color: var(--el-border-color-lighter);
  overflow: hidden;
}

.objects-page__table :deep(.el-card__body) {
  overflow: auto;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
