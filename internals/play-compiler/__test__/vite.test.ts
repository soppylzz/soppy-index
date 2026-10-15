import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { build, createServer } from "vite"
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping"
import { miniCompilerPlugin, type PluginEvidence } from "@soppy-index/play-compiler/plugin"
import { locate } from "@soppy-index/test"
const root = fileURLToPath(new URL("../vite/", import.meta.url))
function config(evidence: PluginEvidence[]) {
  return {
    configFile: false as const,
    root,
    plugins: [miniCompilerPlugin(root, (e) => evidence.push(e))],
    esbuild: { exclude: /\.mini\.ts$/ },
    logLevel: "silent" as const,
  }
}
test("real Vite dev transform sees raw TS before core transforms and composes returned map", async (context) => {
  const evidence: PluginEvidence[] = []
  const server = await createServer({ ...config(evidence), server: { port: 0, host: "127.0.0.1" } })
  context.after(() => server.close())
  await server.listen()
  const address = server.httpServer!.address()
  assert.ok(address && typeof address !== "string")
  const response = await fetch(`http://127.0.0.1:${address.port}/greeting.mini.ts`)
  assert.equal(response.status, 200)
  const code = await response.text()
  assert.match(code, /function\s*\(name\)/)
  assert.doesNotMatch(code, /: string|=> greeting/)
  assert.equal(evidence.length, 1)
  assert.match(evidence[0].input, /: string/)
  assert.match(evidence[0].code, /export var greet/)
  const transformed = await server.transformRequest("/greeting.mini.ts")
  assert.ok(transformed?.map)
  const generated = locate(transformed.code, "greeting + name")
  const original = originalPositionFor(new TraceMap(JSON.stringify(transformed.map)), generated)
  assert.equal(original.line, 2)
  assert.equal(original.column, 47)
  assert.ok(original.source?.endsWith("greeting.mini.ts"))
  assert.ok(
    "sourcesContent" in transformed.map &&
      transformed.map.sourcesContent?.some((text) => text?.includes("name: string"))
  )
})
test("real Vite production build uses handwritten compiler and produces a composed bundle map", async () => {
  const evidence: PluginEvidence[] = []
  const output = await build({
    ...config(evidence),
    build: { write: false, sourcemap: true, minify: false },
  })
  assert.ok(!Array.isArray(output) && "output" in output)
  const chunk = output.output.find((asset) => asset.type === "chunk")
  assert.ok(chunk && chunk.type === "chunk" && chunk.map)
  assert.equal(evidence.length, 1)
  assert.match(evidence[0].input, /: string/)
  assert.match(chunk.code, /function\s*\(name\)/)
  assert.doesNotMatch(chunk.code, /: string/)
  const original = originalPositionFor(
    new TraceMap(JSON.stringify(chunk.map)),
    locate(chunk.code, "greeting + name")
  )
  assert.equal(original.line, 2)
  assert.equal(original.column, 47)
  assert.ok(original.source?.endsWith("greeting.mini.ts"))
})
test("plugin refuses invalid TS and filters dependencies/ordinary JS", async () => {
  const evidence: PluginEvidence[] = [],
    plugin = miniCompilerPlugin(root, (e) => evidence.push(e))
  const transform = plugin.transform
  assert.ok(typeof transform === "function")
  const hook = transform.bind({} as ThisParameterType<typeof transform>)
  assert.equal(await hook("const x: number = 1;", root + "ordinary.ts"), null)
  assert.equal(await hook("const x: number = 1;", root + "node_modules/dep.mini.ts"), null)
  await assert.rejects(
    async () => hook('const x: number = "bad";', root + "invalid.mini.ts"),
    /Expected number/
  )
  assert.equal(evidence.length, 0)
  assert.match(await readFile(root + "greeting.mini.ts", "utf8"), /: string/)
})
