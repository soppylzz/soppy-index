import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  root: import.meta.dirname,
  test: {
    name: "stream",
    include: [mode === "http" ? "__test__/http.test.ts" : "__test__/unit.test.ts"],
    testTimeout: mode === "http" ? 60_000 : 5_000,
    hookTimeout: 60_000,
  },
}))
