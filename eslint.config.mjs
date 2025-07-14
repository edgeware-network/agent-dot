// @ts-check

import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export default tseslint.config({
  languageOptions: {
    parserOptions: {
      ecmaVersion: 2022,
      project: "./tsconfig.json",
      projectService: true,
      tsconfigRootDir: import.meta.dirname,
    },
    parser: tseslint.parser,
  },
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    prettier: prettierPlugin,
  },
  ignores: [
    "next.config.js",
    "postcss.config.js",
    "public/**",
    ".next/**",
    "next-env.d.ts",
  ],
  files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  rules: {
    "@typescript-eslint/no-unused-vars": IS_PRODUCTION ? "error" : "warn",
    "no-console": IS_PRODUCTION ? "error" : "warn",
    "prettier/prettier": ["error"],
    semi: ["error", "always"],
    quotes: ["error", "double"],
  },
  extends: [
    js.configs.recommended,
    tseslint.configs.strict,
    tseslint.configs.strictTypeChecked,
    tseslint.configs.stylisticTypeChecked,
    prettierConfig,
  ],
});
