<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    size?: string | number;
  }>(),
  {
    title: "",
    size: "600px",
  },
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  close: [];
}>();

const modelValue = computed({
  get: () => props.visible,
  set: (v) => emit("update:visible", v),
});

function handleClose() {
  emit("update:visible", false);
  emit("close");
}
</script>

<template>
  <el-drawer
    v-model="modelValue"
    direction="rtl"
    :size="size"
    :modal="true"
    :close-on-click-modal="true"
    :destroy-on-close="true"
    :with-header="!!title"
    @close="handleClose"
  >
    <template v-if="title" #header>
      <span class="side-panel__title">{{ title }}</span>
    </template>

    <div class="side-panel__body">
      <slot />
    </div>

    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
  </el-drawer>
</template>

<style scoped>
.side-panel__title {
  font-weight: 600;
  font-size: 16px;
}
.side-panel__body {
  height: 100%;
}
</style>
