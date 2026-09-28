<script setup lang="ts">
import { computed } from "vue";

// Контуры Lucide (ISC). Не эмодзи: без emoji-шрифта они квадраты и не берут currentColor.
const PATHS: Record<string, string[]> = {
  FIRE: [
    "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z",
  ],
  FLOOD: [
    "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z",
    "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97",
  ],
  GAS: ["M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242", "M16 17H7", "M17 21H9"],
  INTRUSION: [
    "M13 4h3a2 2 0 0 1 2 2v14",
    "M2 20h3",
    "M13 20h9",
    "M10 12v.01",
    "M13 4.562v16.157a1 1 0 0 1-1.242.97L5 20V5.562a2 2 0 0 1 1.515-1.94l4-1A2 2 0 0 1 13 4.561Z",
  ],
  EQUIPMENT_FAILURE: [
    "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  ],
};

// Иконка всегда идёт рядом с подписью, поэтому для скринридера она лишняя.
const props = defineProps<{ code: string }>();

const paths = computed(() => PATHS[props.code] ?? null);
</script>

<template>
  <svg
    v-if="paths"
    class="incident-class-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
</template>

<style scoped>
.incident-class-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  vertical-align: -2px;
}
</style>
