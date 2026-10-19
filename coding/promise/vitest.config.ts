import { defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  test: {
    name: mode === "native" ? "promise-reference" : "promise",
    root: import.meta.dirname,
    env: { PROMISE_TEST_REFERENCE: mode === "native" ? "native" : "" },
    include: ["__test__/**/*.test.ts"],
    testTimeout: 1500,
  },
}))
