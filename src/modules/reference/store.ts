import { defineStore } from "pinia";
import { ref } from "vue";
import { fetchReferenceData } from "./api";
import type { ReferenceData } from "./types";

export const useReferenceStore = defineStore("reference", () => {
  const data = ref<ReferenceData | null>(null);
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function load(force = false) {
    if (data.value && !force) return;
    loading.value = true;
    error.value = null;
    try {
      data.value = await fetchReferenceData();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  }

  return { data, loading, error, load };
});
