<script setup lang="ts">
import { GRAPH_LAYOUT } from "@/modules/objects/lib/graph";

/**
 * Каркас экрана объекта: спинка «предки → фокус» сверху и ряд детей под ней — та же
 * вертикальная проекция, что рисует Vue Flow, чтобы момент, когда вместо скелета появляется
 * граф, не дёргал вёрстку страницы.
 *
 * Размеры карточек берём из раскладки, а не переписываем числами: каркас, у которого узлы
 * шире настоящих, сам и есть то самое дёрганье. Зазоры между узлами — косметика, они могут
 * расходиться, а ширина и высота — нет.
 */
const spineBox = {
  width: `${GRAPH_LAYOUT.size.object.width}px`,
  height: `${GRAPH_LAYOUT.size.object.height}px`,
};
const rowBox = {
  width: `${GRAPH_LAYOUT.size.channel.width}px`,
  height: `${GRAPH_LAYOUT.size.channel.height}px`,
};
</script>

<template>
  <div class="graph-skeleton">
    <el-skeleton animated :count="3" class="graph-skeleton__spine">
      <template #template>
        <el-skeleton-item variant="rect" :style="spineBox" />
      </template>
    </el-skeleton>

    <el-skeleton animated :count="GRAPH_LAYOUT.nodesPerLine" class="graph-skeleton__row">
      <template #template>
        <el-skeleton-item variant="rect" :style="rowBox" />
      </template>
    </el-skeleton>
  </div>
</template>

<style scoped>
.graph-skeleton {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 64px;
  padding: 24px 32px;
  overflow: hidden;
}

/* ElSkeleton рендерит карточки прямыми детьми своего корня, поэтому флекс навешиваем на него. */
.graph-skeleton__spine {
  width: auto;
  display: flex;
  flex-direction: column;
  gap: 48px;
}

.graph-skeleton__row {
  width: auto;
  display: flex;
  flex-direction: row;
  gap: 48px;
}
</style>
