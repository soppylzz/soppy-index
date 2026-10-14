import assert from "node:assert/strict"
import { readFile, access, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { CompileError } from "@soppy-index/compiler/model"
import { loadGraph } from "@soppy-index/compiler/modules"
import { writeGraph } from "@soppy-index/compiler-cli"
import { shake } from "@soppy-index/compiler/shake"
import { execute, fixture } from "../src/helpers.ts"
const entry = fileURLToPath(
  new URL("../../play-compiler/examples/modules/main.ts", import.meta.url)
)
for (const format of ["esm", "cjs"] as const)
  test(`module ${format}: cross-module signatures, unused pure deletion and exact side-effect order`, async (context) => {
    const graph = await loadGraph(entry),
      root = await fixture(context, {}),
      out = join(root, "out")
    const shaking = shake(graph)
    assert.equal(shaking.report.find((r) => r.name === "unused")?.action, "drop")
    assert.equal(shaking.report.find((r) => r.name === "noisy")?.action, "keep")
    await writeGraph(graph, out, shaking.programs, { format, target: "legacy" })
    const extension = format === "cjs" ? "cjs" : "js"
    assert.equal(
      await execute(join(out, `main.${extension}`)),
      "library effect\neffect module\nHello, world\n"
    )
    const text = await readFile(join(out, `library.${extension}`), "utf8")
    assert.doesNotMatch(text, /unused/)
    assert.match(text, /noisy/)
    assert.doesNotMatch(await readFile(join(out, `main.${extension}`), "utf8"), /\.ts["']/)
    const unshaken = join(root, "unshaken")
    await writeGraph(graph, unshaken, new Map(), { format })
    assert.equal(
      await execute(join(unshaken, `main.${extension}`)),
      await execute(join(out, `main.${extension}`))
    )
  })
test("worklist follows closures, intermediate imports and transitive local symbol references", async (context) => {
  const root = await fixture(context, {
    "main.ts": 'import { run } from "./middle.ts"; console.log(run("x"));',
    "middle.ts":
      'import { base } from "./nested/base"; export const run = (x: string): string => base(x); export const dead = (x: string) => base(x);',
    "nested/base.ts":
      'const prefix = "prefix:"; export const base = (x: string) => prefix + x; export const dead = 7;',
  })
  const graph = await loadGraph(join(root, "main.ts")),
    shaking = shake(graph)
  assert.equal(shaking.report.find((r) => r.name === "prefix")?.action, "keep")
  assert.ok(shaking.report.filter((r) => r.name === "dead").every((r) => r.action === "drop"))
  await writeGraph(graph, join(root, "out"), shaking.programs, { format: "cjs" })
  assert.equal(await execute(join(root, "out/main.cjs")), "prefix:x\n")
})
test("unused import binding becomes a side-effect import without reordering evaluation", async (context) => {
  const root = await fixture(context, {
    "main.ts": 'import { dead } from "./dep"; console.log("main");',
    "dep.ts": 'export const dead = 1; console.log("dep");',
  })
  const graph = await loadGraph(join(root, "main.ts")),
    shaking = shake(graph)
  await writeGraph(graph, join(root, "out"), shaking.programs)
  assert.match(await readFile(join(root, "out/main.js"), "utf8"), /import "\.\/dep\.js"/)
  assert.equal(await execute(join(root, "out/main.js")), "dep\nmain\n")
})
test("entry library exports can be requested explicitly", async (context) => {
  const root = await fixture(context, {
    "main.ts": "export const api = (x: number) => x + 1; export const dead = 2;",
  })
  const graph = await loadGraph(join(root, "main.ts"))
  assert.equal(shake(graph).report.find((r) => r.name === "api")?.action, "drop")
  assert.equal(shake(graph, ["api"]).report.find((r) => r.name === "api")?.action, "keep")
  assert.throws(() => shake(graph, ["missing"]), /Unknown entry export/)
})
for (const [label, files, code] of [
  ["cycle", { "main.ts": 'import "./dep";', "dep.ts": 'import "./main";' }, "M003"],
  [
    "missing export",
    { "main.ts": 'import { absent } from "./dep";', "dep.ts": "export const found = 1;" },
    "M004",
  ],
  ["missing file", { "main.ts": 'import "./absent";' }, "M002"],
  ["package import", { "main.ts": 'import "package";' }, "M001"],
  ["unsupported extension", { "main.ts": 'import "./dep.json";' }, "M001"],
  [
    "signature mismatch",
    {
      "main.ts": 'import { f } from "./dep"; f(1);',
      "dep.ts": "export const f = (x: string) => x;",
    },
    "T003",
  ],
] as [string, Record<string, string>, string][])
  test(`modules reject ${label}`, async (context) => {
    const root = await fixture(context, files)
    await assert.rejects(
      () => loadGraph(join(root, "main.ts")),
      (error: unknown) =>
        error instanceof CompileError && error.diagnostics.some((d) => d.code === code)
    )
  })
test("duplicate output stems are refused", async (context) => {
  const root = await fixture(context, {
    "main.ts": 'import "./a.ts"; import "./a.js";',
    "a.ts": "const x = 1;",
    "a.js": "const y = 2;",
  })
  const graph = await loadGraph(join(root, "main.ts"))
  await assert.rejects(() => writeGraph(graph, join(root, "out"), new Map()), /Output collision/)
})
test("special export property names work in CJS without prototype mutation", async (context) => {
  const root = await fixture(context, {
    "main.ts": 'import { __proto__ } from "./dep"; console.log(__proto__);',
    "dep.ts": 'export const __proto__ = "safe";',
  })
  const graph = await loadGraph(join(root, "main.ts"))
  await writeGraph(graph, join(root, "out"), new Map(), { format: "cjs" })
  assert.equal(await execute(join(root, "out/main.cjs")), "safe\n")
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
