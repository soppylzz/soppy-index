import { defineConfig } from "vitest/config"

export default defineConfig({
  root: import.meta.dirname,
  test: {
    name: "web-storage-next-lab",
    pool: "forks",
    setupFiles: ["./__test__/setup.ts"],
    include: ["__test__/**/*.test.ts"],
  },
})
