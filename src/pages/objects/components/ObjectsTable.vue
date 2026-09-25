<script setup lang="ts">
import { InfoFilled } from "@element-plus/icons-vue";
import { OBJECT_KIND_LABEL, ORPHAN_TAG } from "@/modules/objects/consts";
import { objectLabel } from "@/modules/objects/lib/label";
import ObjectLevelTag from "@/modules/objects/components/ObjectLevelTag.vue";
import ObjectRiskDot from "@/modules/objects/components/ObjectRiskDot.vue";
import type { NodeRisk, ObjectKind, ObjectTreeNode } from "@/modules/objects/types";
import { formatDateTime } from "@/shared/lib/date";

/**
 * Дерево реестра. Про роутинг не знает — наружу только `rowClick(id)`, как в PredictionTable.vue,
 * чтобы таблица оставалась проекцией данных, а состояние держал URL страницы.
 *
 * `riskOf` — уже разрешённый производный риск: источник знания о риске
 * знает только реестр, таблица его не выводит и не переспрашивает.
 */
const props = defineProps<{
  items: ObjectTreeNode[];
  riskOf: (node: ObjectTreeNode) => NodeRisk | null;
  /** Подпись колонки, короткая форма: null — скан не отработал, показывать нечего. */
  riskNote: string | null;
  expandRowKeys: string[];
  loading?: boolean;
}>();

const emit = defineEmits<{ rowClick: [id: string] }>();

function handleRowClick(row: ObjectTreeNode) {
  emit("rowClick", row.id);
}

// Слот el-table отдаёт row как DefaultRow без полей ObjectTreeNode (тип не выводится из row-key),
// поэтому разрешает риск одна обёртка с кастом.
function riskOfRow(row: unknown): NodeRisk | null {
  return props.riskOf(row as ObjectTreeNode);
}

// Хелперы ниже принимают конкретные значения, а не узел целиком — по той же причине.
function kindLabel(kind: ObjectKind): string {
  return OBJECT_KIND_LABEL[kind] ?? kind;
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="items"
    row-key="id"
    :tree-props="{ children: 'children' }"
    :expand-row-keys="expandRowKeys"
    stripe
    border
    height="100%"
    style="width: 100%"
    show-overflow-tooltip
    highlight-current-row
    empty-text="Под фильтр ничего не попало"
    @row-click="handleRowClick"
  >
    <el-table-column label="Объект" min-width="300">
      <template #default="{ row }">
        <span class="objects-table__name">{{ objectLabel(row.object) }}</span>
        <span class="objects-table__kind">{{ kindLabel(row.object.kind) }}</span>
        <el-tag v-if="row.detached" type="warning" size="small" effect="plain">{{ ORPHAN_TAG }}</el-tag>
      </template>
    </el-table-column>

    <el-table-column label="Уровень" width="130" align="center">
      <template #default="{ row }">
        <ObjectLevelTag :level="row.object.hierarchyLevel" />
      </template>
    </el-table-column>

    <el-table-column label="Риск" min-width="170">
      <template #header>
        <span class="objects-table__header">
          <span>Риск</span>
          <el-tooltip v-if="riskNote" :content="riskNote" placement="top">
            <el-icon class="objects-table__help"><InfoFilled /></el-icon>
          </el-tooltip>
        </span>
      </template>
      <template #default="{ row }">
        <ObjectRiskDot :risk="riskOfRow(row)" />
      </template>
    </el-table-column>

    <el-table-column label="ID" width="140">
      <template #default="{ row }">
        <span class="objects-table__id">{{ row.id }}</span>
      </template>
    </el-table-column>

    <el-table-column label="Снимок реестра" width="160">
      <template #default="{ row }">
        {{ formatDateTime(row.object.snapshotAt) }}
      </template>
    </el-table-column>
  </el-table>
</template>

<style scoped>
.objects-table__name {
  color: var(--el-text-color-primary);
}

.objects-table__kind {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.objects-table__id {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}

.objects-table__header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.objects-table__help {
  color: var(--el-text-color-secondary);
}
</style>
