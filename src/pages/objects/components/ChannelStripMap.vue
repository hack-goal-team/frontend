<script setup lang="ts">
import { computed } from "vue";
import { channelStripHiddenText, NO_PREDICTIONS_LABEL, UNKNOWN_VALUE } from "@/modules/objects/consts";
import { RISK_LABEL } from "@/modules/predictions/consts";
import type { NodeRisk } from "@/modules/objects/types";
import type { Channel } from "@/modules/channels/types";

/**
 * Самописная полоса-мини-карта над графом (не `<MiniMap>`: он рисует координаты контейнера,
 * а нам нужен перечень каналов слева направо в том же порядке, что и колонка графа).
 *
 * Полоса показывает ВСЕ загруженные каналы, а не только отрисованные: диспетчер видит, где
 * относительно всего объекта находится узел, и доходит до него одним кликом. Сегменты правее
 * `shownCount` затемнены — они есть в данных, но на графе пока не показаны.
 *
 * Порядок сегментов = порядок выдачи `/channels`, и это НЕ порядок на трассе (см. JSDoc в
 * `mergeChannelPages`), поэтому полоса не подписывается «участками» и по риску не масштабируется.
 *
 * Сегменты сняты с tab-последовательности, а трек в `aria-hidden`: те же каналы доступны
 * с клавиатуры узлами графа, а две тысячи повторов в озвучке только мешают.
 */
const props = defineProps<{
  channels: Channel[];
  riskOf: (channel: Channel) => NodeRisk | null;
  /** Сколько каналов сейчас на графе — остальные сегменты только намекуют позицию. */
  shownCount: number;
  highlightedId: string | null;
  /** null — X-Total-Count не приходил: «сколько всего» не выдумываем. */
  total: number | null;
  /** Подпись идущего скана подсветки («ищем канал… 4 из 12»); null — скана нет. */
  progress?: string | null;
}>();

const emit = defineEmits<{ select: [channelId: string] }>();

/** Сколько каналов не прочитано; null-счётчик — «неизвестно», а не «все прочитаны». */
const hiddenCount = computed(() => (props.total === null ? 0 : Math.max(props.total - props.channels.length, 0)));

const counterText = computed(() => {
  const of = props.total === null ? "" : ` из ${props.total}`;
  return `Каналов загружено: ${props.channels.length}${of}`;
});

/** ○ «без прогноза» вправе утверждать только завершённый источник — остальное «не знаем». */
function certain(risk: NodeRisk | null): boolean {
  return !!risk && (risk.source === "registry" || risk.coverage === "complete");
}

function variant(channel: Channel): string {
  const risk = props.riskOf(channel);
  if (risk?.level) return risk.level.toLowerCase();
  return certain(risk) ? "none" : "muted";
}

function segmentTitle(channel: Channel): string {
  const risk = props.riskOf(channel);
  const riskText = risk?.level
    ? `${RISK_LABEL[risk.level]} риск`
    : certain(risk)
      ? NO_PREDICTIONS_LABEL
      : UNKNOWN_VALUE;
  const name = channel.name?.trim() || `Канал #${channel.id}`;
  return `${name} · ${channel.sensorType} · ${riskText}${channel.known ? "" : " · нет в реестре"}`;
}
</script>

<template>
  <div class="strip">
    <div class="strip__caption">
      <span class="strip__count">{{ counterText }}</span>
      <span v-if="progress" class="strip__progress">{{ progress }}</span>
      <span v-else-if="hiddenCount" class="strip__hidden">{{ channelStripHiddenText(hiddenCount) }}</span>
    </div>

    <div class="strip__track" aria-hidden="true">
      <span
        v-for="(channel, index) in channels"
        :key="channel.id"
        class="strip__segment"
        :class="[
          `strip__segment_${variant(channel)}`,
          {
            strip__segment_outside: index >= shownCount,
            strip__segment_highlighted: channel.id === highlightedId,
          },
        ]"
        :title="segmentTitle(channel)"
        @click="emit('select', channel.id)"
      />
    </div>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex-shrink: 0;
}

.strip__caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.strip__progress {
  color: var(--el-color-primary);
}

.strip__track {
  display: flex;
  align-items: stretch;
  gap: 1px;
  height: 12px;
  padding: 1px;
  border-radius: var(--el-border-radius-base);
  background: var(--el-fill-color-lighter);
  overflow: hidden;
}

.strip__segment {
  flex: 1 1 0;
  min-width: 2px;
  cursor: pointer;
  background: var(--el-text-color-placeholder);
}

.strip__segment_high {
  background: var(--el-color-danger);
}

.strip__segment_medium {
  background: var(--el-color-warning);
}

.strip__segment_low {
  background: var(--el-color-success);
}

.strip__segment_none {
  background: var(--el-border-color-darker);
}

/* штриховка — «не знаем»: не путать с ○ «прогнозов нет» */
.strip__segment_muted {
  background: repeating-linear-gradient(135deg, var(--el-border-color) 0 2px, var(--el-fill-color-lighter) 2px 4px);
}

/* есть в данных, но на графе пока не отрисовано */
.strip__segment_outside {
  opacity: 0.35;
}

.strip__segment_highlighted {
  box-shadow: 0 0 0 2px var(--el-color-primary);
}
</style>
