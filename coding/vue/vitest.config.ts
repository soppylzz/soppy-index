import { defineConfig } from "vitest/config"

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    name: "vue",
    root: import.meta.dirname,
    environment: "jsdom",
    include: ["__test__/**/*.test.{ts,tsx}"],
  },
})
