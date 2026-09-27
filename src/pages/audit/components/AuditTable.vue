<script setup lang="ts">
import { formatDateTime } from "@/shared/lib/date";
import type { AuditEntry } from "@/modules/audit/types";

defineProps<{
  items: AuditEntry[];
  loading?: boolean;
}>();

/** payload — JSON-строка по контракту; если разбор не удался, показываем как есть. */
function prettyPayload(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
</script>

<template>
  <el-table
    v-loading="loading"
    :data="items"
    stripe
    height="100%"
    style="width: 100%"
    :border="true"
    show-overflow-tooltip
  >
    <el-table-column type="expand" width="44">
      <template #default="{ row }">
        <pre class="audit-table__payload">{{ prettyPayload(row.payload) }}</pre>
      </template>
    </el-table-column>

    <el-table-column label="Время" width="150">
      <template #default="{ row }">
        {{ formatDateTime(row.occurredAt) }}
      </template>
    </el-table-column>

    <el-table-column prop="actor" label="Пользователь" width="170" />

    <el-table-column prop="category" label="Категория" width="140" />

    <el-table-column prop="action" label="Действие" width="200" />

    <el-table-column prop="target" label="Цель" min-width="220" />
  </el-table>
</template>

<style scoped>
.audit-table__payload {
  margin: 0;
  padding: 12px 20px;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
