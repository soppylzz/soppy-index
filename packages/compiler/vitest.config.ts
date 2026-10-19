import { configDefaults, defineConfig } from "vitest/config"

export default defineConfig(({ mode }) => ({
  resolve: { conditions: ["development"] },
  test: {
    name: "compiler",
    root: import.meta.dirname,
    include: mode === "built" ? ["__test__/built.test.ts"] : ["__test__/**/*.test.ts"],
    exclude: [...configDefaults.exclude, ...(mode === "built" ? [] : ["__test__/built.test.ts"])],
  },
}))
