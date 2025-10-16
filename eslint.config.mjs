// @ts-check

import nextPlugin from "@next/eslint-plugin-next";
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import globals from "globals";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export default tseslint.config(
  {
    ignores: [
      "next.config.js",
      "postcss.config.js",
      "public/**",
      ".next/**",
      "next-env.d.ts",
      ".papi/**",
      "scripts/dist/**",
    ],
  },
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
      parserOptions: {
        ecmaVersion: 2022,
        project: "./tsconfig.json",
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      parser: tseslint.parser,
    },
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
  },
  js.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  prettierConfig,
  {
    plugins: {
      prettier: prettierPlugin,
      react: reactPlugin,
      "react-hooks": hooksPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": IS_PRODUCTION ? "error" : "warn",
      "no-console": IS_PRODUCTION ? "error" : "warn",
      "prettier/prettier": ["error"],
      semi: ["error", "always"],
      quotes: ["error", "double"],
      // Next.js specific rules
      "@next/next/no-html-link-for-pages": "error",
    },
  },
);
