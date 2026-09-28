<script setup lang="ts">
import { computed } from "vue";
import { BellFilled } from "@element-plus/icons-vue";
import { usePredictionsQuery } from "../composables/usePredictionsQuery";
import { useAlarmNavigation } from "../composables/useAlarmNavigation";
import { useAuthStore } from "@/modules/auth/store";
import { pluralize } from "@/shared/lib/pluralize";

const auth = useAuthStore();
const { showAlarming } = useAlarmNavigation();

/**
 * limit=1: из ответа нужен только `X-Total-Count`, строки здесь не показываются.
 * Ключ — обычный список прогнозов, поэтому успешное решение (`predictionKeys.all`)
 * снимает прогноз из счётчика так же, как из таблицы журнала.
 */
const { data } = usePredictionsQuery({ alarming: true, status: "NEW", limit: 1, offset: 0 });

const count = computed(() => data.value?.total ?? 0);
const hasCount = computed(() => count.value > 0);

const tooltipText = computed(() => {
  if (auth.isEmptyScope) {
    return "Область видимости не назначена";
  }
  if (!hasCount.value) {
    return "Нет прогнозов с датчиком в тревоге без решения";
  }

  const scope = auth.scope;
  const scopeLabel =
    scope?.kind === "ALL" ? " по всем объектам" : scope?.names[0] ? ` по объекту «${scope.names[0]}»` : "";

  const noun = pluralize(count.value, "прогноз", "прогноза", "прогнозов");
  const verb = count.value === 1 ? "ждёт" : "ждут";
  return `${count.value} ${noun} с датчиком в тревоге ${verb} решения${scopeLabel}. Нажмите, чтобы открыть список.`;
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
