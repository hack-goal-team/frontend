import "@fontsource/m-plus-rounded-1c/latin-400.css";
import "@fontsource/m-plus-rounded-1c/latin-500.css";
import "@fontsource/m-plus-rounded-1c/latin-700.css";
import "@fontsource/m-plus-rounded-1c/cyrillic-400.css";
import "@fontsource/m-plus-rounded-1c/cyrillic-500.css";
import "@fontsource/m-plus-rounded-1c/cyrillic-700.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin } from "@tanstack/vue-query";
import "element-plus/theme-chalk/dark/css-vars.css";
import "@vue-flow/core/dist/style.css";
import "@vue-flow/core/dist/theme-default.css";
import "@vue-flow/controls/dist/style.css";
import "./styles/vue-flow-theme.css";
import "./styles/main.css";
import { router } from "./router";
import App from "./App.vue";

async function bootstrap() {
  if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === "true") {
    const { worker } = await import("@/mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass" });
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.use(VueQueryPlugin);
  app.mount("#app");
}

bootstrap();
