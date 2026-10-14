import { resolve } from "node:path"
import type { Plugin } from "vite"
import { compile } from "@soppy-index/compiler/compiler"
import type { SourceMap } from "@soppy-index/compiler/emitter"
export interface PluginEvidence {
  id: string
  input: string
  code: string
  map: SourceMap
}
/** Limit teaching-mode prechecking to self-contained .mini.ts files. Bundler module resolution is outside this plugin's checker. */
export function miniCompilerPlugin(
  root: string,
  observe?: (evidence: PluginEvidence) => void
): Plugin {
  const prefix = resolve(root).split("\\").join("/") + "/"
  return {
    name: "learning-mini-compiler",
    enforce: "pre",
    transform(input, id) {
      const file = id.split("?")[0]
      if (!file.startsWith(prefix) || file.includes("/node_modules/") || !file.endsWith(".mini.ts"))
        return null
      const result = compile(
        { file, text: input },
        { target: "legacy", format: "esm", language: "ts" },
        file + ".js",
        false
      )
      const evidence = { id: file, input, code: result.code, map: result.map }
      observe?.(evidence)
      console.log(
        `[mini-compiler] transform ${file}; checked original TS; returned ESM + map (${result.map.mappings.length} chars)`
      )
      return { code: result.code, map: JSON.stringify(result.map) }
    },
  }
}
