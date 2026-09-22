<script setup lang="ts">
import { computed } from "vue";
import { InfoFilled } from "@element-plus/icons-vue";
import { GRAPH_TITLE, LEVEL_LABEL, ORPHAN_TAG, RELATIONS_HINT } from "@/modules/objects/consts";
import { objectLabel } from "@/modules/objects/lib/label";
import type { InfrastructureObject } from "@/modules/objects/types";

/**
 * Шапка экрана объекта: заголовок разделa + селект объекта + постоянная подсказка про природу
 * связей. Селект — единственный способ сменить объект, не возвращаясь в реестр; состояние
 * живёт в URL (`/objects/:id`), отсюда только `select(id)`.
 */
const props = defineProps<{
  objects: InfrastructureObject[];
  currentId: string;
  detached: boolean;
  disabled?: boolean;
}>();

const emit = defineEmits<{ select: [id: string] }>();

const options = computed(() =>
  props.objects.map((object) => ({
    id: object.id,
    label: objectLabel(object),
    hint: `${LEVEL_LABEL[object.hierarchyLevel]} · ID ${object.id}`,
  })),
);

/**
 * Ид из URL может отсутствовать в выдаче (объект вне области видимости → 404 по контракту).
 * Тогда в списке всё равно обязана быть строка с этим id: пустой селект выглядит как сбой
 * приложения, а не как отсутствие права.
 */
const allOptions = computed(() => {
  if (!props.currentId || options.value.some((option) => option.id === props.currentId)) return options.value;
  return [{ id: props.currentId, label: objectLabel({ id: props.currentId, name: null }), hint: "" }, ...options.value];
});
</script>

<template>
  <Teleport defer to="#header-left">
    <div class="graph-heading">
      <span class="page-title">{{ GRAPH_TITLE }}</span>

      <el-select
        :model-value="currentId"
        :disabled="disabled"
        filterable
        placeholder="Объект"
        class="graph-heading__select"
        @update:model-value="emit('select', String($event))"
      >
        <el-option v-for="option in allOptions" :key="option.id" :label="option.label" :value="option.id">
          <span class="graph-heading__option">
            <span>{{ option.label }}</span>
            <span class="graph-heading__option-hint">{{ option.hint }}</span>
          </span>
        </el-option>
      </el-select>

      <el-tag v-if="detached" type="warning" size="small" effect="plain">{{ ORPHAN_TAG }}</el-tag>

      <el-tooltip :content="RELATIONS_HINT" placement="bottom-start" :show-after="200">
        <el-icon class="graph-heading__help"><InfoFilled /></el-icon>
      </el-tooltip>
    </div>
  </Teleport>
</template>

<style scoped>
.graph-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.graph-heading__select {
  width: 260px;
}

.graph-heading__option {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.graph-heading__option-hint {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.graph-heading__help {
  color: var(--el-text-color-secondary);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}
</style>
