import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import i18nLint from "./eslint-plugin-i18n-lint.js";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  // i18n lint rules — only for translation files
  {
    files: ["src/i18n/**/*.ts"],
    plugins: {
      "i18n-lint": i18nLint,
    },
    rules: {
      "i18n-lint/no-double-braces": "error",
      "i18n-lint/placeholder-mismatch": "warn",
      "i18n-lint/no-malformed-strings": "error",
    },
  },
);
