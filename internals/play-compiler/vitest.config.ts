import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { conditions: ["development"] },
  test: {
    name: "play-compiler",
    root: import.meta.dirname,
    include: ["__test__/*.test.ts"],
  },
})
