<script setup lang="ts">
import { computed } from "vue";
import { Warning } from "@element-plus/icons-vue";
import { useNotificationsStore } from "../store";
import { useCriticalNavigation } from "../useCriticalNavigation";
import { useAuthStore } from "@/modules/auth/store";
import { pluralize } from "@/shared/lib/pluralize";

const store = useNotificationsStore();
const auth = useAuthStore();
const { showCritical } = useCriticalNavigation();

const count = computed(() => store.unreviewedCriticalCount);
const hasCount = computed(() => count.value > 0);

const tooltipText = computed(() => {
  if (auth.isEmptyScope) {
    return "Область видимости не назначена";
  }
  if (!hasCount.value) {
    return "Нет критических прогнозов без решения";
  }

  const scope = auth.scope;
  const scopeLabel =
    scope?.kind === "ALL" ? " по всем объектам" : scope?.names[0] ? ` по объекту «${scope.names[0]}»` : "";

  const noun = pluralize(count.value, "прогноз", "прогноза", "прогнозов");
  return `${count.value} критических ${noun} ждут решения${scopeLabel}. Нажмите, чтобы открыть список.`;
});

function onClick() {
  if (!hasCount.value) return;
  showCritical();
}
</script>

<template>
  <el-tooltip :content="tooltipText" placement="bottom">
    <div
      class="critical-indicator"
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
        <el-icon :size="20"><Warning /></el-icon>
      </el-badge>
    </div>
  </el-tooltip>
</template>

<style scoped>
.critical-indicator {
  display: flex;
  align-items: center;
  line-height: 1;
}

.critical-indicator.is-clickable {
  cursor: pointer;
}

.critical-indicator :deep(.el-badge) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  vertical-align: middle;
}

.critical-indicator :deep(.el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
</style>
