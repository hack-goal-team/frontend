<script setup lang="ts">
import { computed } from "vue";
import { Warning, WarningFilled, Document, Bell, InfoFilled } from "@element-plus/icons-vue";
import type { Component } from "vue";

const props = defineProps<{
  title: string;
  value: number;
  hint?: string;
  icon?: "Warning" | "WarningFilled" | "Document" | "Bell" | "InfoFilled";
  color?: "primary" | "success" | "warning" | "danger" | "info";
  clickable?: boolean;
}>();

const emit = defineEmits<{
  click: [];
}>();

const icons: Record<string, Component> = {
  Warning,
  WarningFilled,
  Document,
  Bell,
  InfoFilled,
};

const iconComponent = computed(() => (props.icon ? icons[props.icon] : null));

const color = computed(() => props.color ?? "primary");
</script>

<template>
  <el-card
    shadow="never"
    class="dashboard-card"
    :class="{ 'dashboard-card_clickable': clickable }"
    :role="clickable ? 'button' : undefined"
    :tabindex="clickable ? 0 : undefined"
    @click="clickable && emit('click')"
    @keydown.enter="clickable && emit('click')"
  >
    <div class="dashboard-card__body">
      <div class="dashboard-card__icon" :class="`is-${color}`">
        <el-icon :size="28">
          <component :is="iconComponent" v-if="iconComponent" />
        </el-icon>
      </div>

      <div class="dashboard-card__content">
        <div class="dashboard-card__title">{{ title }}</div>
        <div class="dashboard-card__value">{{ value }}</div>
        <div v-if="hint" class="dashboard-card__hint">{{ hint }}</div>
      </div>
    </div>
  </el-card>
</template>

<style scoped>
.dashboard-card :deep(.el-card__body) {
  padding: 20px;
}

.dashboard-card_clickable {
  cursor: pointer;
  transition: border-color 0.2s;
}

.dashboard-card_clickable:hover,
.dashboard-card_clickable:focus-visible {
  border-color: var(--el-color-primary);
}

.dashboard-card__body {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.dashboard-card__icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  flex-shrink: 0;
}

.dashboard-card__icon.is-primary {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
}
.dashboard-card__icon.is-success {
  background: var(--el-color-success-light-9);
  color: var(--el-color-success);
}
.dashboard-card__icon.is-warning {
  background: var(--el-color-warning-light-9);
  color: var(--el-color-warning);
}
.dashboard-card__icon.is-danger {
  background: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}
.dashboard-card__icon.is-info {
  background: var(--el-color-info-light-9);
  color: var(--el-color-info);
}

.dashboard-card__content {
  flex: 1;
  min-width: 0;
}

.dashboard-card__title {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.dashboard-card__value {
  font-size: 28px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  line-height: 1.2;
}

.dashboard-card__hint {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  line-height: 1.3;
}
</style>
