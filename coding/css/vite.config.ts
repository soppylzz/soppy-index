import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vite"

const exercises = new URL("./exercises/", import.meta.url)
const pages = Object.fromEntries(
  readdirSync(exercises, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => [entry.name, fileURLToPath(new URL(`${entry.name}/index.html`, exercises))])
)

export default defineConfig({
  plugins: [
    {
      name: "css-exercise-sources",
      generateBundle() {
        // Keep the gallery's source links readable after CSS bundling.
        for (const name of Object.keys(pages)) {
          this.emitFile({
            type: "asset",
            fileName: `exercises/${name}/style.css`,
            source: readFileSync(new URL(`${name}/style.css`, exercises), "utf8"),
          })
        }
      },
    },
  ],
  build: {
    rollupOptions: {
      input: { gallery: fileURLToPath(new URL("./index.html", import.meta.url)), ...pages },
    },
  },
})
