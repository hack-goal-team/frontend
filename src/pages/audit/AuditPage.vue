<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { AUDIT_PAGE_SIZE, AUDIT_TITLE } from "@/modules/audit/consts";
import { useAuditQuery } from "@/modules/audit/composables/useAuditQuery";
import type { AuditQuery } from "@/modules/audit/types";
import AuditFiltersPanel from "./components/AuditFilters.vue";
import AuditPagination from "./components/AuditPagination.vue";
import AuditTable from "./components/AuditTable.vue";
import AuditTableSkeleton from "./components/skeletons/AuditTableSkeleton.vue";

const route = useRoute();

const query = computed<AuditQuery>(() => {
  const rawAction = route.query.action;
  const action = Array.isArray(rawAction)
    ? rawAction.filter((v): v is string => typeof v === "string")
    : typeof rawAction === "string"
      ? [rawAction]
      : [];

  return {
    limit: Number(route.query.limit ?? AUDIT_PAGE_SIZE),
    offset: Number(route.query.offset ?? 0),
    from: (route.query.from as string) || undefined,
    to: (route.query.to as string) || undefined,
    actor: (route.query.actor as string) || undefined,
    category: (route.query.category as string) || undefined,
    action: action.length > 0 ? action : undefined,
  };
});

const { items, total, isLoading, isFetching, isError, error } = useAuditQuery(query);

const isEmpty = computed(() => !isLoading.value && !isError.value && items.value.length === 0);
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">{{ AUDIT_TITLE }}</span>
  </Teleport>

  <div class="audit-page">
    <AuditFiltersPanel class="audit-page__filters" />

    <el-card
      class="audit-page__table"
      shadow="never"
      :body-style="{ padding: 0, height: '100%', display: 'flex', flexDirection: 'column' }"
    >
      <el-alert
        v-if="isError"
        type="error"
        :title="`Ошибка загрузки: ${(error as Error)?.message ?? 'неизвестно'}`"
        :closable="false"
        show-icon
      />

      <AuditTableSkeleton v-else-if="isLoading" :rows="25" />

      <el-empty v-else-if="isEmpty" description="Записей не найдено" />

      <AuditTable v-else :items="items" :loading="isFetching" />
    </el-card>

    <div class="audit-page__pagination">
      <AuditPagination :disable="isEmpty || isLoading || isFetching || isError" :total="total" />
    </div>
  </div>
</template>

<style scoped>
.audit-page {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.audit-page__filters {
  flex-shrink: 0;
}

.audit-page__table {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-color: var(--el-border-color-lighter);
  overflow: hidden;
}

.audit-page__table :deep(.el-card__body) {
  overflow: auto;
}

.audit-page__pagination {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  min-height: 32px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
