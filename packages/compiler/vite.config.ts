import { defineConfig } from "vite"

export default defineConfig({
  build: {
    target: "node22",
    minify: false,
    sourcemap: true,
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    rollupOptions: {
      external: [/^node:/, "@jridgewell/gen-mapping", "@jridgewell/trace-mapping"],
      output: {
        preserveModules: true,
        entryFileNames: "[name].js",
      },
    },
  },
})
