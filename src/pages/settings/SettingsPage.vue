<script setup lang="ts">
import IntegrationsCard from "./components/IntegrationsCard.vue";
import ThresholdsForm from "./components/ThresholdsForm.vue";
</script>

<template>
  <Teleport defer to="#header-left">
    <span class="page-title">Настройки</span>
  </Teleport>

  <div class="settings-page">
    <IntegrationsCard />
    <ThresholdsForm />
  </div>
</template>

<style scoped>
.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.settings-page {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(820px, 1fr));
  gap: 16px;
}
</style>
