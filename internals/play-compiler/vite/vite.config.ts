import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"
import { miniCompilerPlugin } from "../src/vite-plugin.ts"
const root = fileURLToPath(new URL(".", import.meta.url))
export default defineConfig({
  root,
  plugins: [miniCompilerPlugin(root)],
  esbuild: { exclude: /\.mini\.ts$/ },
  build: { outDir: "../dist/vite", emptyOutDir: true, sourcemap: true, minify: false },
})
