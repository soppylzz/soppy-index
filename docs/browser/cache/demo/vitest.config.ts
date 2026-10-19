import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  test: {
    name: "http-cache-next-lab",
    include: [mode === "ui" ? "__test__/ui.test.mjs" : "__test__/**/*.test.ts"],
    testTimeout: 30_000,
  },
}))
