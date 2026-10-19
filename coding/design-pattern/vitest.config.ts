import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { name: "design-pattern", root: import.meta.dirname, include: ["__test__/**/*.test.ts"] },
})
