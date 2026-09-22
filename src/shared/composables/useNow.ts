import { onScopeDispose, ref } from "vue";

/**
 * Реактивное «сейчас». `Date.now()` внутри computed не пересчитывается —
 * возраст данных стоял бы на времени первого рендера.
 */
export function useNow(intervalMs = 30_000) {
  const now = ref(new Date());

  const timer = setInterval(() => {
    now.value = new Date();
  }, intervalMs);

  onScopeDispose(() => clearInterval(timer));

  return now;
}
