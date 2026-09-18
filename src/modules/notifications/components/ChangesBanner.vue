<script setup lang="ts">
import { useNotificationsStore } from "../store";

const emit = defineEmits<{
  reload: [];
  showCritical: [];
}>();

const store = useNotificationsStore();
</script>

<template>
  <el-alert v-if="store.hasChanges" type="info" show-icon :closable="true" @close="store.clearChanges()">
    <template #title> Обновилось {{ store.snapshot.length }} критических прогнозов </template>

    <template #default>
      <div class="changes-banner__actions">
        <el-button text size="small" @click="emit('reload')"> Обновить таблицу </el-button>
        <el-button text size="small" @click="emit('showCritical')"> Показать критические </el-button>
      </div>
    </template>
  </el-alert>
</template>

<style scoped>
.changes-banner__actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
</style>
