import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const useMock = env.VITE_USE_MOCK === "true";
  const apiTarget = env.VITE_API_TARGET;

  const proxy =
    !useMock && apiTarget
      ? {
          "/api": {
            target: apiTarget,
            changeOrigin: true,
            secure: false,
            cookieDomainRewrite: "",
          },
        }
      : undefined;
  return {
    plugins: [
      vue(),
      AutoImport({
        imports: ["vue", "vue-router", "pinia"],
        resolvers: [ElementPlusResolver({ importStyle: "css" })],
        dts: "src/types/auto-imports.d.ts",
      }),
      Components({
        resolvers: [ElementPlusResolver()],
        dts: "src/types/components.d.ts",
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: 5173,
      proxy,
    },
  };
});
