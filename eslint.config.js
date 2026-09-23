import js from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "coverage",
      "public/mockServiceWorker.js",
      "src/types/auto-imports.d.ts",
      "src/types/components.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["**/*.vue"],
    languageOptions: {
      // В .vue no-undef не отключается типами (в отличие от .ts), а браузерных
      // глобалов в конфиге нет — declaring `window` точечно, без всей библиотеки globals.
      globals: { window: "readonly" },
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    plugins: { prettier },
    rules: {
      "vue/multi-word-component-names": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  configPrettier,
);
