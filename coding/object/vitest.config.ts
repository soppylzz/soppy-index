import { defineConfig } from "vitest/config"

export default defineConfig({
  test: { name: "object", root: import.meta.dirname, include: ["__test__/**/*.test.ts"] },
})
