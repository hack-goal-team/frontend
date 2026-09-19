<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";

defineProps<{ total: number; disable: boolean }>();

const route = useRoute();
const router = useRouter();

const limit = computed(() => Number(route.query.limit ?? 50));
const offset = computed(() => Number(route.query.offset ?? 0));

const currentPage = computed({
  get: () => Math.floor(offset.value / limit.value) + 1,
  set: (page) => {
    router.replace({
      query: { ...route.query, offset: (page - 1) * limit.value },
    });
  },
});

const pageSize = computed({
  get: () => limit.value,
  set: (size) => {
    router.replace({ query: { ...route.query, limit: size, offset: 0 } });
  },
});
</script>

<template>
  <el-pagination
    v-model:current-page="currentPage"
    v-model:page-size="pageSize"
    :disabled="disable"
    :total="total"
    :page-sizes="[25, 50, 100]"
    layout="total, sizes, prev, pager, next"
    background
  />
</template>
