<script setup lang="ts">
// useSse()
</script>

<template>
	<el-container class="app-layout">
		<el-header class="app-header">
			<div class="app-header__title">Прогнозы инцидентов</div>
			<div class="app-header__actions"></div>
		</el-header>
		<el-main>
			<router-view />
		</el-main>
	</el-container>
</template>

<style scoped>
.app-layout {
	height: 100vh;
}
.app-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-bottom: 1px solid var(--el-border-color);
}
.app-header__title {
	font-weight: 600;
	font-size: 16px;
}
</style>
