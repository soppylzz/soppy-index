import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  test: {
    name: "security-next-lab",
    include: [
      mode === "ui"
        ? "__test__/ui.test.mjs"
        : mode === "http"
          ? "__test__/http.test.mjs"
          : "__test__/**/*.test.ts",
    ],
    testTimeout: 30_000,
  },
}))
