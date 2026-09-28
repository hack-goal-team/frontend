<script setup lang="ts">
import { computed, ref } from "vue";
import { ArrowRight, Bottom, Top } from "@element-plus/icons-vue";
import { formatDateTime, formatHorizon } from "@/shared/lib/date";
import { formatContribution, formatProbability } from "@/shared/lib/probability";
import { SHOW_ON_GRAPH } from "@/modules/objects/consts";
import { REASON_GROUP_LABEL } from "@/modules/predictions/consts";
import type { PredictionDetail } from "@/modules/predictions/types";
import IncidentClassTag from "@/modules/predictions/components/IncidentClassTag.vue";
import EquipmentCheckTag from "./EquipmentCheckTag.vue";
import RiskTag from "./RiskTag.vue";
import SensorStateTag from "./SensorStateTag.vue";
import StatusTag from "./StatusTag.vue";
import DecisionForm from "./DecisionForm.vue";
import { useLabels } from "@/modules/reference/composables/useLabels.ts";

const props = defineProps<{
  detail: PredictionDetail;
}>();

/**
 * Переход на граф объекта — наружу, роутингом компонент не занимается
 * (так же устроен клик по строке в таблице прогнозов).
 */
const emit = defineEmits<{ showOnGraph: [objectId: string, channelId?: string] }>();

const { reasonLabel } = useLabels();

/** `context.objectId` — единственное, без чего переход бессмысленен: графа для «никуда» нет. */
const objectId = computed(() => props.detail.prediction.context?.objectId ?? null);
const channelId = computed(() => props.detail.prediction.context?.channelId ?? null);

/** «Последнее решение» — первое из истории: поля `lastDecision` у `Prediction` в контракте v0 нет. */

const isEquipment = computed(() => props.detail.prediction.kind === "EQUIPMENT");
const horizon = computed(() => formatHorizon(props.detail.prediction.computedAt, props.detail.prediction.horizonUntil));

const currentState = computed(() => props.detail.prediction.currentState ?? null);
const lastAlarmAt = computed(() => props.detail.prediction.lastAlarmAt ?? null);

const reasons = computed(() =>
  [...(props.detail.prediction.reasons ?? [])].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution)),
);

const hasDecisions = computed(() => props.detail.decisions.length > 0);

const reasonsOpen = ref(false);
const historyOpen = ref(false);

function showOnGraph() {
  if (!objectId.value) return;
  emit("showOnGraph", objectId.value, channelId.value ?? undefined);
}
</script>

<template>
  <div class="prediction-panel">
    <!-- У прогноза отказа аварии нет — только тревожное состояние датчика, и оно несрочное. -->
    <el-alert
      v-if="currentState?.alarming"
      :type="isEquipment ? 'info' : 'error'"
      :closable="false"
      show-icon
      :title="isEquipment ? 'Датчик сейчас в тревожном состоянии' : 'Событие уже наступило'"
      :description="lastAlarmAt ? `Последняя тревога: ${formatDateTime(lastAlarmAt)}` : undefined"
    />

    <!-- Прогноз -->
    <el-descriptions :column="1" border>
      <el-descriptions-item label="Класс прогноза">
        <IncidentClassTag :code="detail.prediction.incidentType" />
      </el-descriptions-item>

      <el-descriptions-item label="Вероятность">
        {{ formatProbability(detail.prediction.probability) }}
      </el-descriptions-item>

      <el-descriptions-item v-if="detail.prediction.kind === 'EQUIPMENT'" label="К проверке">
        <EquipmentCheckTag :level="detail.prediction.riskLevel" />
      </el-descriptions-item>

      <el-descriptions-item v-else label="Риск">
        <RiskTag :level="detail.prediction.riskLevel" />
      </el-descriptions-item>

      <el-descriptions-item label="Статус">
        <StatusTag :status="detail.prediction.status" />
      </el-descriptions-item>

      <!-- Класс по типу датчика, а не прогноз модели: тот в заголовке карточки. -->
      <el-descriptions-item label="Класс датчика">
        <span v-if="detail.prediction.context?.incidentClass">
          {{ detail.prediction.context.incidentClass.description }}
        </span>
        <span v-else class="text-muted">—</span>
      </el-descriptions-item>

      <el-descriptions-item label="Объект">
        <div class="prediction-panel__object">
          <span v-if="detail.prediction.context?.objectName">
            {{ detail.prediction.context.objectName }}
          </span>
          <span v-else class="text-muted">—</span>
          <el-button v-if="objectId" size="small" type="primary" link @click="showOnGraph">
            {{ SHOW_ON_GRAPH }}
          </el-button>
        </div>
      </el-descriptions-item>

      <el-descriptions-item label="Датчик">
        <span v-if="detail.prediction.context?.sensorName">
          {{ detail.prediction.context.sensorName }}
          <span v-if="detail.prediction.context.sensorType" class="text-muted">
            ({{ detail.prediction.context.sensorType }})
          </span>
        </span>
        <span v-else class="text-muted">—</span>
      </el-descriptions-item>

      <el-descriptions-item label="Подсистема">
        {{ detail.prediction.context?.engineeringSystem ?? "—" }}
      </el-descriptions-item>

      <el-descriptions-item label="Текущее состояние">
        <div class="prediction-panel__state">
          <SensorStateTag :state="currentState" :incident-type="detail.prediction.incidentType" />
          <span v-if="currentState?.observedAt" class="text-muted">
            на {{ formatDateTime(currentState.observedAt) }}
          </span>
        </div>
      </el-descriptions-item>

      <el-descriptions-item label="Последняя тревога">
        <span v-if="lastAlarmAt">{{ formatDateTime(lastAlarmAt) }}</span>
        <span v-else class="text-muted">—</span>
      </el-descriptions-item>

      <el-descriptions-item label="Горизонт">
        {{ horizon.until }} <span class="text-muted">· {{ horizon.span }}</span>
      </el-descriptions-item>

      <el-descriptions-item label="Вычислен">
        {{ formatDateTime(detail.prediction.computedAt) }}
      </el-descriptions-item>
    </el-descriptions>

    <!-- Факторы прогноза -->
    <div v-if="reasons.length > 0" class="prediction-panel__section">
      <h3
        class="prediction-panel__section-title prediction-panel__section-title_toggle"
        role="button"
        tabindex="0"
        :aria-expanded="reasonsOpen"
        @click="reasonsOpen = !reasonsOpen"
        @keydown.enter.prevent="reasonsOpen = !reasonsOpen"
      >
        <el-icon class="prediction-panel__chevron" :class="{ 'prediction-panel__chevron_open': reasonsOpen }">
          <ArrowRight />
        </el-icon>
        Факторы прогноза
      </h3>

      <div v-show="reasonsOpen" class="prediction-panel__reasons">
        <div v-for="(reason, index) in reasons" :key="`${reason.feature}-${index}`" class="prediction-panel__reason">
          <el-icon :class="`prediction-panel__reason_direction_${reason.direction.toLowerCase()}`">
            <Top v-if="reason.direction === 'UP'" />
            <Bottom v-else />
          </el-icon>

          <span class="prediction-panel__reason-factor" :title="reason.feature">{{ reason.factor }}</span>

          <span v-if="reason.value !== null" class="prediction-panel__reason-value">{{ reason.value }}</span>

          <span class="prediction-panel__reason-group text-muted">
            {{ REASON_GROUP_LABEL[reason.group] ?? reason.group }}
          </span>

          <span class="prediction-panel__reason-contribution">{{ formatContribution(reason.contribution) }}</span>
        </div>
      </div>
    </div>

    <!-- История решений -->
    <div class="prediction-panel__section">
      <h3
        class="prediction-panel__section-title prediction-panel__section-title_toggle"
        role="button"
        tabindex="0"
        :aria-expanded="historyOpen"
        @click="historyOpen = !historyOpen"
        @keydown.enter.prevent="historyOpen = !historyOpen"
      >
        <el-icon class="prediction-panel__chevron" :class="{ 'prediction-panel__chevron_open': historyOpen }">
          <ArrowRight />
        </el-icon>
        История решений
      </h3>

      <div v-show="historyOpen">
        <el-empty v-if="!hasDecisions" description="Решений нет" :image-size="80" />

        <div v-else class="prediction-panel__timeline">
          <el-timeline>
            <el-timeline-item
              v-for="(d, index) in detail.decisions"
              :key="d.id"
              :timestamp="formatDateTime(d.decidedAt)"
              placement="top"
              :class="{ 'prediction-panel__timeline-item_last': index === 0 }"
            >
              <div class="prediction-panel__decision">
                <div>
                  {{ reasonLabel(d.reasonCode) }}
                </div>
                <div v-if="d.comment" class="prediction-panel__decision-comment">
                  {{ d.comment }}
                </div>
                <div class="prediction-panel__decision-author">
                  {{ d.decidedBy }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </div>

    <!-- Форма принятия решения -->
    <DecisionForm :prediction-id="detail.prediction.id" class="prediction-panel__form" />
  </div>
</template>

<style scoped>
/*
 * Панель скроллится целиком телом el-drawer (у него overflow: auto).
 * Жёсткая flex-колонка на height:100% с внутренними скроллами секций
 * схлопывала «Факторы прогноза» в ноль: описания и форма выбирали
 * всю высоту, а у элемента с overflow:auto минимальная высота — 0.
 */
.prediction-panel {
  display: flex;
  flex-direction: column;
  gap: 24px;
  /* рост — чтобы прижать форму к низу на коротком контенте; длинный контент растягивает панель */
  flex: 1 1 auto;
}

.prediction-panel__section {
  display: flex;
  flex-direction: column;
}

.prediction-panel__reasons {
  padding-right: 4px;
}

.prediction-panel__reason {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.prediction-panel__reason:last-child {
  border-bottom: none;
}

.prediction-panel__reason_direction_up {
  color: var(--el-color-danger);
}

.prediction-panel__reason_direction_down {
  color: var(--el-color-success);
}

.prediction-panel__reason-factor {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prediction-panel__reason-value {
  flex-shrink: 0;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-regular);
}

.prediction-panel__reason-group {
  flex-shrink: 0;
  font-size: 12px;
}

.prediction-panel__reason-contribution {
  flex-shrink: 0;
  min-width: 64px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
}

.prediction-panel__section-title {
  flex-shrink: 0;
  margin: 0 0 12px;
  font-size: 14px;
  font-weight: 600;
}

.prediction-panel__form {
  /* всегда внизу панели: на коротком контенте — free space, на длинном — последний в прокрутке */
  margin-top: auto;
}

.prediction-panel__section-title_toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.prediction-panel__section-title_toggle:hover {
  color: var(--el-color-primary);
}

.prediction-panel__chevron {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: transform 0.2s ease;
}

.prediction-panel__chevron_open {
  transform: rotate(90deg);
}

/* Узел последнего (самого нового) решения: обычный узел — серый, этот — primary с кольцом */
.prediction-panel__timeline-item_last :deep(.el-timeline-item__node) {
  background-color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 4px var(--el-color-primary-light-9);
}

.prediction-panel__decision {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.prediction-panel__object {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.prediction-panel__state {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prediction-panel__decision-reason {
  font-weight: 500;
}

.prediction-panel__decision-comment {
  color: var(--el-text-color-regular);
  font-size: 13px;
}

.prediction-panel__decision-author {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.text-muted {
  color: var(--el-text-color-placeholder);
}
</style>
