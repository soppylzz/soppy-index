import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { name: "schedule", root: import.meta.dirname, include: ["__test__/**/*.test.ts"] },
})
