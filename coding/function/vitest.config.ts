import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { name: "function", root: import.meta.dirname, include: ["__test__/**/*.test.ts"] },
})
