<script setup lang="ts">
import { computed } from "vue";
import { BellFilled } from "@element-plus/icons-vue";
import { usePredictionsQuery } from "../composables/usePredictionsQuery";
import { useAlarmNavigation } from "../composables/useAlarmNavigation";
import { useAuthStore } from "@/modules/auth/store";
import { useReferenceStore } from "@/modules/reference/store";
import { EQUIPMENT_THRESHOLD_UNAVAILABLE } from "@/modules/reference/consts";
import { pluralize } from "@/shared/lib/pluralize";

const auth = useAuthStore();
const reference = useReferenceStore();
const { showAlarming } = useAlarmNavigation();

/**
 * limit=1: нужен только `X-Total-Count`. Фильтр тот же, что у перехода по клику, поэтому
 * число на значке равно числу строк журнала: отказы «к проверке», последний пересчёт, действующие.
 */
const { data } = usePredictionsQuery(
  () => ({
    kind: "EQUIPMENT",
    activeOnly: true,
    latestOnly: true,
    minProbability: reference.equipmentCheckThreshold ?? undefined,
    limit: 1,
    offset: 0,
  }),
  // SSE про отказы не пишет, а прогнозы истекают молча — как сводка, рефетч по времени.
  { refetchInterval: 60_000 },
);

// Без порога из справочника запрос считал бы все отказы — такое число не показываем.
const count = computed(() => (reference.equipmentCheckThreshold === null ? 0 : (data.value?.total ?? 0)));
const hasCount = computed(() => count.value > 0);

const tooltipText = computed(() => {
  if (auth.isEmptyScope) {
    return "Область видимости не назначена";
  }
  if (reference.equipmentCheckThreshold === null) {
    return EQUIPMENT_THRESHOLD_UNAVAILABLE;
  }
  if (!hasCount.value) {
    return "Нет датчиков к проверке: действующих прогнозов отказа выше порога нет";
  }

  const scope = auth.scope;
  const scopeLabel =
    scope?.kind === "ALL" ? " по всем объектам" : scope?.names[0] ? ` по объекту «${scope.names[0]}»` : "";

  const noun = pluralize(count.value, "датчик", "датчика", "датчиков");
  return `К проверке ${count.value} ${noun}${scopeLabel}: модель прогнозирует отказ оборудования. Нажмите, чтобы открыть список.`;
});

function onClick() {
  if (!hasCount.value) return;
  showAlarming();
}
</script>

<template>
  <el-tooltip :content="tooltipText" placement="bottom">
    <div
      class="alarming-indicator"
      :class="{ 'is-clickable': hasCount }"
      :aria-label="tooltipText"
      role="button"
      :tabindex="hasCount ? 0 : -1"
      :show-after="300"
      @click="onClick"
      @keydown.enter="onClick"
      @keydown.space.prevent="onClick"
    >
      <el-badge :value="count" :hidden="!hasCount" type="danger" :max="99">
        <el-icon :size="20"><BellFilled /></el-icon>
      </el-badge>
    </div>
  </el-tooltip>
</template>

<style scoped>
.alarming-indicator {
  display: flex;
  align-items: center;
  line-height: 1;
}

.alarming-indicator.is-clickable {
  cursor: pointer;
}

.alarming-indicator :deep(.el-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  vertical-align: middle;
}

.alarming-indicator :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
