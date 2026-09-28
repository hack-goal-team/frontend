<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useReferenceStore } from "@/modules/reference/store";
import { PERIOD_SHORTCUTS } from "@/shared/lib/date";
import type { PredictionKind } from "@/modules/predictions/types";

// Порогов риска у модели отказов нет, а её вероятность несопоставима с инцидентной —
// ползунок с отметками medium/high там вводил бы в заблуждение.
const props = defineProps<{ disable: boolean; kind: PredictionKind }>();

const route = useRoute();
const router = useRouter();
const reference = useReferenceStore();

const status = computed({
  get: () => (route.query.status as string) ?? "",
  set: (v) => update({ status: v || undefined }),
});

// На бэк уходит code: он и есть строка типа из context.sensorType, фильтр — точное
// совпадение с ним, поэтому вариантов из справочника достаточно и ручной ввод здесь только вредит.
const sensorType = computed({
  get: () => (route.query.sensorType as string) ?? "",
  set: (v) => update({ sensorType: v || undefined }),
});

// «Уже горит» и «В норме» — два разных фильтра, «Все» — отсутствие параметра. Прогнозы без
// currentState (нет событий, цель не канал) не попадают ни в «Уже горит», ни в «В норме».
const alarming = computed({
  get: () => (route.query.alarming as string) ?? "",
  set: (v) => update({ alarming: v || undefined }),
});

/**
 * Период — `[from, to)` по computedAt. `Z` в value-format даёт ISO с локальным смещением
 * (`…+03:00`) — на бэк оно уходит уже заэкранированным (`%2B`), иначе `+` станет пробелом и 400.
 */
const period = computed({
  get: (): [string, string] | null => {
    const from = route.query.from as string | undefined;
    const to = route.query.to as string | undefined;
    return from && to ? [from, to] : null;
  },
  set: (v) => update({ from: v?.[0], to: v?.[1] }),
});

const minProbability = computed({
  get: () => Number(route.query.minProbability ?? 0),
  set: (v) => update({ minProbability: v > 0 ? v : undefined }),
});

const activeOnly = computed({
  get: () => route.query.activeOnly === "true",
  set: (v) => update({ activeOnly: v ? true : undefined }),
});

// Отметки порога на шкале — чтобы фильтр совпадал с тем, что админ настроил на /settings.
// Подписей не даём: порог виден по цветной точке на треке, цвета навешаны в стилах.
const probabilityMarks = computed<Record<number, string>>(() => {
  const { medium, high } = reference.thresholds;
  const marks: Record<number, string> = {};
  if (medium !== null) marks[medium] = "";
  if (high !== null) marks[high] = "";
  return marks;
});

function update(patch: Record<string, unknown>) {
  router.replace({
    query: {
      ...route.query,
      ...patch,
      offset: 0, // сброс пагинации при смене фильтра
    },
  });
}

// Вкладка — не фильтр: «Сбросить» оставляет пользователя в том же виде прогнозов.
function reset() {
  router.replace({ query: props.kind === "EQUIPMENT" ? { kind: props.kind } : {} });
}
</script>

<template>
  <el-form :disabled="disable" :inline="true" class="prediction-filters">
    <div class="prediction-filters__group">
      <el-form-item label="Период">
        <el-date-picker
          v-model="period"
          type="datetimerange"
          value-format="YYYY-MM-DDTHH:mm:ssZ"
          :shortcuts="PERIOD_SHORTCUTS"
          start-placeholder="С"
          end-placeholder="По"
          style="min-width: 340px"
        />
      </el-form-item>
    </div>

    <div class="prediction-filters__group">
      <el-form-item label="Тип датчика">
        <el-select v-model="sensorType" clearable filterable placeholder="Все" style="min-width: 200px">
          <el-option
            v-for="t in reference.data?.sensorTypes ?? []"
            :key="t.code"
            :label="t.description"
            :value="t.code"
          />
        </el-select>
      </el-form-item>

      <el-form-item label="Состояние">
        <el-select v-model="alarming" clearable placeholder="Все" style="min-width: 140px">
          <el-option label="Уже горит" value="true" />
          <el-option label="В норме" value="false" />
        </el-select>
      </el-form-item>

      <el-form-item label="Статус">
        <el-select v-model="status" clearable placeholder="Все" style="min-width: 160px">
          <el-option
            v-for="s in reference.data?.predictionStatuses ?? []"
            :key="s.code"
            :label="s.description"
            :value="s.code"
          />
        </el-select>
      </el-form-item>
    </div>

    <div class="prediction-filters__group">
      <el-form-item v-if="kind === 'INCIDENT'" label="Мин. вероятность">
        <el-slider
          v-model="minProbability"
          :min="0"
          :max="1"
          :step="0.05"
          :marks="probabilityMarks"
          style="min-width: 200px"
        />
      </el-form-item>

      <el-form-item>
        <el-checkbox v-model="activeOnly">Только активные</el-checkbox>
      </el-form-item>
    </div>

    <div class="prediction-filters__group prediction-filters__group_action">
      <el-form-item>
        <el-button @click="reset">Сбросить</el-button>
      </el-form-item>
    </div>
  </el-form>
</template>

<style scoped>
/* Перенос — по группам: каждая группа остаётся цельной, «Сбросить» прижат вправо. */
.prediction-filters {
  padding-block: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 28px;
  row-gap: 12px;
}

.prediction-filters__group {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 16px;
}

.prediction-filters__group_action {
  margin-left: auto;
}

.prediction-filters :deep(.el-form-item) {
  margin-right: 0;
  margin-bottom: 0;
}

/* Точки Element Plus рисует по возрастанию порога, а справочник гарантирует
   medium < high — поэтому первая точка «средний», последняя «высокий». */
.prediction-filters :deep(.el-slider__marks-stop:first-child) {
  background-color: var(--el-color-warning);
}

.prediction-filters :deep(.el-slider__marks-stop:last-child) {
  background-color: var(--el-color-danger);
}
</style>
