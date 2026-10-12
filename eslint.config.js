import eslint from "@eslint/js"
import globals from "globals"
import tslint from "typescript-eslint"
import prettier from "eslint-config-prettier"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["**/node_modules/**", "**/.next/**", "**/dist/**", "**/coverage/**"]),
  eslint.configs.recommended,
  ...tslint.configs.recommended,

  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.es2025,
        ...globals.node,
      },
    },
  },

  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
    },
  },
  {
    files: ["handwrite/type-challenges/**/*.ts"],
    rules: {
      "@typescript-eslint/ban-ts-comment": ["error", { minimumDescriptionLength: 0 }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-unsafe-function-type": "off",
      "no-useless-assignment": "off",
    },
  },
  prettier,
])
