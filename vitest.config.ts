import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      "coding/*/vitest.config.ts",
      "packages/*/vitest.config.ts",
      "internals/*/vitest.config.ts",
      "docs/**/demo/vitest.config.ts",
    ],
  },
})
