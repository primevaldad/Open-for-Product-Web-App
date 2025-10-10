// eslint.config.mjs — fully flat-config ready

import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import nextPlugin from "@next/eslint-plugin-next";
import importPlugin from "eslint-plugin-import";

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,ts,jsx,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        project: true,
      },
    },
    plugins: {
      "@next/next": nextPlugin,
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": "off",
      "import/no-unused-modules": ["warn", { unusedExports: true }],
    },
    ignores: [
      "node_modules",
      ".next",
      "out",
      "dist",
      "build",
      "coverage",
      "**/*.config.*",
      "scripts/",
    ],
  },
];
