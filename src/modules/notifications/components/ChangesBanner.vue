<script setup lang="ts">
import { computed } from "vue";
import { useNotificationsStore } from "../store";
import { formatNewPredictions } from "../lib/format";

const emit = defineEmits<{
  reload: [];
  showCritical: [];
}>();

const store = useNotificationsStore();

const message = computed(() => formatNewPredictions(store.newPredictionIds.length));
</script>

<template>
  <el-alert v-if="store.hasNewPredictions" type="info" show-icon :closable="true" @close="store.clearNewPredictions()">
    <template #title>
      <span style="margin-left: 10px">{{ message }}</span>
    </template>

    <template #default>
      <div class="changes-banner__actions">
        <el-button text type="primary" size="small" @click="emit('reload')"> [Обновить таблицу] </el-button>
        <!-- TODO: не показывать если текущий роут соответствует предлагаемому -->
        <el-button text type="warning" size="small" @click="emit('showCritical')"> [Показать критические] </el-button>
      </div>
    </template>
  </el-alert>
</template>

<style scoped>
.changes-banner__actions {
  display: flex;
  margin-top: 2px;
}
</style>
