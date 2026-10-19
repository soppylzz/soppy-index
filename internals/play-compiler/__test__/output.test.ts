import assert from "node:assert/strict"
import { readFile, access, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { test } from "vitest"
import { loadGraph } from "@soppy-index/compiler"
import { writeGraph } from "../src/writer.ts"
import { fixture, execute } from "@soppy-index/test"
import { compileExample } from "../src/experiments.ts"

test("single-file experiment executes output and preserves portable JS/declaration map paths", async (context) => {
  const root = await fixture(context, {
    "hello.ts": 'export const value: string = "Hello, world"; console.log(value);',
  })
  const out = join(root, "out")
  const output = await compileExample(join(root, "hello.ts"), { target: "legacy" }, out)
  assert.equal(output, join(out, "hello.js"))
  assert.equal(await execute(output), "Hello, world\n")
  for (const file of ["hello.js.map", "hello.d.ts.map"]) {
    const map = JSON.parse(await readFile(join(out, file), "utf8"))
    assert.equal(resolve(out, map.sources[0]), join(root, "hello.ts"))
    assert.match(map.sourcesContent[0], /value: string/)
  }
})

test("unsupported declarations fail before any output is written", async (context) => {
  const root = await fixture(context, {
    "main.ts": 'import "./dep"; const f = (x: number) => x; export const alias = f;',
    "dep.ts": 'console.log("dep");',
  })
  const graph = await loadGraph(join(root, "main.ts"))
  await assert.rejects(
    () => writeGraph(graph, join(root, "out"), new Map()),
    /directly exported arrow/
  )
  await assert.rejects(() => access(join(root, "out")))
})

test("output refuses source directories and preserves existing package metadata", async (context) => {
  const root = await fixture(context, {
    "main.ts": "console.log(1);",
    "out/package.json": '{"type":"module","name":"keep-me"}\n',
  })
  const graph = await loadGraph(join(root, "main.ts"))
  await assert.rejects(() => writeGraph(graph, root, new Map()), /differ from source/)
  await writeGraph(graph, join(root, "out"), new Map())
  assert.equal(JSON.parse(await readFile(join(root, "out/package.json"), "utf8")).name, "keep-me")
  await writeFile(join(root, "out/package.json"), '{"type":"commonjs"}\n')
  await assert.rejects(
    () => writeGraph(graph, join(root, "out"), new Map()),
    /incompatible package/
  )
})
