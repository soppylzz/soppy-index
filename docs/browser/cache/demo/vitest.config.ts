import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  esbuild: { jsx: "automatic" },
  test: {
    name: "http-cache-next-lab",
    include: [mode === "ui" ? "__test__/ui.test.mjs" : "__test__/**/*.test.{ts,tsx}"],
    testTimeout: 30_000,
  },
}))
