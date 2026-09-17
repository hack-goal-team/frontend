import '@fontsource/m-plus-rounded-1c/latin-400.css'
import '@fontsource/m-plus-rounded-1c/latin-500.css'
import '@fontsource/m-plus-rounded-1c/latin-700.css'
import '@fontsource/m-plus-rounded-1c/cyrillic-400.css'
import '@fontsource/m-plus-rounded-1c/cyrillic-500.css'
import '@fontsource/m-plus-rounded-1c/cyrillic-700.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './styles/main.css'
import { router } from './router'
import App from './App.vue'

async function bootstrap() {
	if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true') {
		const { worker } = await import('@/mocks/browser')
		await worker.start({ onUnhandledRequest: 'bypass' })
	}

	const app = createApp(App)
	app.use(createPinia())
	app.use(router)
	app.use(VueQueryPlugin)
	app.use(ElementPlus)
	app.mount('#app')
}

bootstrap()
