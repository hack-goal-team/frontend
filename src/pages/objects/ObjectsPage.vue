<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { InfoFilled } from "@element-plus/icons-vue";
import { useAuthStore } from "@/modules/auth/store";
import EmptyScopeNotice from "@/modules/auth/components/EmptyScopeNotice.vue";
import { collectExpandableKeys, countTreeNodes, filterTree } from "@/modules/objects/lib/tree";
import { objectLabel } from "@/modules/objects/lib/label";
import { useObjectRegistry } from "@/modules/objects/composables/useObjectRegistry";
import {
  ALLOW_RISK_FILTER_FROM_DERIVED,
  NO_RISK_FILTER_VALUE,
  OBJECTS_TITLE,
  RISK_SCAN_PARTIAL_ALERT,
  RISK_UNSUPPORTED_HINT,
} from "@/modules/objects/consts";
import type { HierarchyLevel, ObjectTreeNode } from "@/modules/objects/types";
import { pluralize } from "@/shared/lib/pluralize";
import ObjectsFilters from "./components/ObjectsFilters.vue";
import ObjectsTable from "./components/ObjectsTable.vue";
import ObjectsTableSkeleton from "./components/skeletons/ObjectsTableSkeleton.vue";

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const {
  roots,
  stats,
  items,
  total,
  riskSupport,
  riskCoverage,
  riskScanned,
  riskScanPages,
  riskScanBusy,
  riskUnattributed,
  riskNote,
  riskNoteShort,
  riskUnavailable,
  refetchRiskMap,
  riskOf,
  isLoading,
  isFetching,
  isError,
  error,
} = useObjectRegistry();

// --- состояние фильтров: только URL, пустое значение => undefined ---

const level = computed<HierarchyLevel | null>(() => {
  const raw = Number(route.query.level);
  return raw === 1 || raw === 2 || raw === 3 ? (raw as HierarchyLevel) : null;
});

const riskFilter = computed<string | null>(() => (route.query.risk as string) || null);
const search = computed(() => ((route.query.q as string) ?? "").trim().toLowerCase());

/**
 * Фильтр по риску активен, пока реестр реально отдаёт `risk`. Включить производный риск —
 * значит поднять ALLOW_RISK_FILTER_FROM_DERIVED и выполнить рецепт из его JSDoc,
 * иначе диспетчер сможет отфильтровать по тому, чего мы не знаем.
 */
const riskFilterEnabled = computed(() => riskSupport.value === "supported" || ALLOW_RISK_FILTER_FROM_DERIVED);

/**
 * «Без прогноза» — утверждение об отсутствии активных прогнозов, а не «мы не досмотрели»:
 * предлагать его вправе только завершённый источник.
 */
const noRiskFilterEnabled = computed(() => riskSupport.value === "supported" || riskCoverage.value === "complete");

/**
 * Значение узла для фильтра по риску. Отличается от того, что показывает колонка:
 * «без прогноза» и производный уровень — разные утверждения, и фильтровать по неполному
 * скану нельзя (рецепт включения — в JSDoc у ALLOW_RISK_FILTER_FROM_DERIVED).
 */
function filterValueOf(node: ObjectTreeNode): string | null {
  if (!ALLOW_RISK_FILTER_FROM_DERIVED) {
    const risk = node.object.risk;
    return risk ? (risk.riskLevel ?? NO_RISK_FILTER_VALUE) : null;
  }

  const resolved = riskOf(node);
  if (!resolved) return null;
  if (resolved.level === null) return resolved.coverage === "partial" ? null : NO_RISK_FILTER_VALUE;
  return resolved.level;
}

function matches(node: ObjectTreeNode): boolean {
  if (level.value !== null && node.object.hierarchyLevel !== level.value) return false;

  if (riskFilterEnabled.value && riskFilter.value) {
    const value = filterValueOf(node);
    if (value === null || value !== riskFilter.value) return false;
  }

  if (search.value) {
    const haystack = `${objectLabel(node.object)} ${node.id}`.toLowerCase();
    if (!haystack.includes(search.value)) return false;
  }

  return true;
}

const hasFilter = computed(
  () => level.value !== null || !!search.value || (!!riskFilter.value && riskFilterEnabled.value),
);

const visibleRoots = computed(() => (hasFilter.value ? filterTree(roots.value, matches) : roots.value));

// Раскрытие выводимо из URL: присланная ссылка открывает экран готовым, локального состояния нет.
const expandedIds = computed(() => collectExpandableKeys(visibleRoots.value));
const shown = computed(() => countTreeNodes(visibleRoots.value));

const isEmpty = computed(() => !isLoading.value && !isError.value && items.value.length === 0);

/**
 * Подпись источника риска. `riskNote` у реестра закрывает «выведено»; упавший скан подписи
 * не даёт (`null`) — о нём говорит el-alert с кнопкой «Повторить», дублировать нельзя.
 * Для "unknown" (пустая выдача — поля risk нет ни в одной записи) своего текста нет,
 * и пустой реестр ничего про withRisk не доказывает — формулируем здесь. Последний
 * fallback — реестр сам прислал `risk`.
 */
const riskSummaryText = computed<string | null>(() => {
  if (riskNote.value) return riskNote.value;
  if (riskCoverage.value === "none" && riskSupport.value !== "supported") return null;
  if (riskSupport.value === "unknown") return "Сведений о риске нет: реестр пуст, вывод о withRisk сделать нельзя";
  return "Уровень риска — из сводки реестра";
});

/**
 * Чем именно ограничен обрезанный скан: диспетчер должен видеть масштаб неполноты,
 * а не только факт («прочитано 120 из ~400, 3 прогноза вообще без объекта»).
 */
const riskScanHint = computed(() => {
  const pages = riskScanPages.value ? `, страниц ${riskScanPages.value}` : "";
  const orphan = riskUnattributed.value
    ? ` · ${riskUnattributed.value} ${pluralize(riskUnattributed.value, "прогноз", "прогноза", "прогнозов")} вне объектов`
    : "";
  return `Уровни выведены по ${riskScanned.value} активным прогнозам${pages}${orphan}. Родитель может показывать риск ниже реального.`;
});

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
    <ObjectsFilters
      :disable="auth.isEmptyScope"
      :risk-filter-enabled="riskFilterEnabled"
      :no-risk-enabled="noRiskFilterEnabled"
      class="objects-page__filters"
    />

    <div class="objects-page__caption">
      <span v-if="hasFilter">Показано {{ shown }} из {{ stats.nodes }}</span>
      <span v-else>Всего узлов: {{ stats.nodes }}</span>
      <span class="objects-page__risk-note">{{ riskSummaryText }}</span>
      <el-tooltip :content="statsText" placement="top">
        <el-icon class="objects-page__help"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>

    <el-alert
      v-if="riskCoverage === 'partial'"
      class="objects-page__alert"
      type="warning"
      :title="RISK_SCAN_PARTIAL_ALERT"
      :description="riskScanHint"
      :closable="false"
      show-icon
    />

    <el-alert
      v-else-if="riskUnavailable"
      class="objects-page__alert"
      type="warning"
      :title="RISK_UNSUPPORTED_HINT"
      :closable="false"
      show-icon
    >
      <!-- Скан уже падал: без повтора диспетчеру остаётся перезагружать всю страницу. -->
      <el-button size="small" :loading="riskScanBusy" @click="refetchRiskMap()">Повторить скан</el-button>
    </el-alert>

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

      <ObjectsTableSkeleton v-else-if="isLoading" :rows="14" />

      <el-empty v-else-if="isEmpty" description="Реестр пуст">
        <p class="objects-page__empty-hint">{{ riskSummaryText }}</p>
      </el-empty>

      <ObjectsTable
        v-else
        :items="visibleRoots"
        :risk-of="riskOf"
        :risk-note="riskNoteShort"
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

.objects-page__alert {
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

.objects-page__risk-note {
  color: var(--el-text-color-placeholder);
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

.objects-page__empty-hint {
  margin: 8px 0 0;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
