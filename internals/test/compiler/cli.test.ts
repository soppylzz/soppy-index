import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import { execa } from "execa"
import { parseArguments } from "@soppy-index/compiler-cli"
import { fixture, execute } from "../src/helpers.ts"
const cli = fileURLToPath(new URL("../../compiler-cli/src/index.ts", import.meta.url))
test("mri aliases, equals syntax and flags before positional arguments preserve independent options", () => {
  const result = parseArguments([
    "--target=legacy",
    "-o",
    "result",
    "compile",
    "hello.ts",
    "--format",
    "esm",
  ])
  assert.ok(result.command !== "help")
  assert.equal(result.options.target, "legacy")
  assert.equal(result.options.format, "esm")
  assert.equal(result.path, "hello.ts")
  assert.ok(result.outDir.endsWith("result"))
  assert.deepEqual(parseArguments(["-h"]), { command: "help" })
})
test("repeatable exports are collected and boolean negation follows mri syntax", () => {
  const result = parseArguments([
    "modules",
    "main.ts",
    "--shake",
    "--entry-export=first",
    "--entry-export",
    "second",
  ])
  assert.ok(result.command !== "help")
  assert.deepEqual(result.entryExports, ["first", "second"])
  const disabled = parseArguments(["modules", "main.ts", "--no-shake"])
  assert.ok(disabled.command !== "help")
  assert.equal(disabled.treeShake, false)
})
test("unknown, missing, invalid, repeated and misplaced CLI values are rejected", () => {
  for (const args of [
    ["compile", "hello.ts", "--unknown"],
    ["compile", "hello.ts", "--out"],
    ["compile", "hello.ts", "--target"],
    ["compile", "hello.ts", "--target", "es5"],
    ["compile", "hello.ts", "--format", "umd"],
    ["compile", "hello.ts", "--out", "a", "--out", "b"],
    ["modules", "main.ts", "--entry-export"],
    ["modules", "main.ts", "--entry-export", "api"],
    ["compile", "hello.ts", "--shake"],
    ["compile", "hello.ts", "extra.ts"],
    ["compile", "hello.ts", "--help", "--help"],
    ["modules", "main.ts", "--shake", "--shake"],
  ])
    assert.throws(() => parseArguments(args), Error, args.join(" "))
})
test("workspace CLI compiles from caller cwd and fs-extra creates nested artifacts", async (context) => {
  const root = await fixture(context, {
    "hello.ts": 'const f = (x: string) => "Hello, " + x; console.log(f("world"));',
  })
  const result = await execa(
    process.execPath,
    [
      "--conditions=development",
      cli,
      "compile",
      "hello.ts",
      "--target=legacy",
      "-o",
      "output/nested",
    ],
    { cwd: root, timeout: 5000 }
  )
  assert.equal(JSON.parse(result.stdout).event, "emitted")
  assert.equal(await execute(join(root, "output/nested/hello.js")), "Hello, world\n")
  assert.equal(
    JSON.parse(await readFile(join(root, "output/nested/hello.js.map"), "utf8")).version,
    3
  )
  assert.ok((await readFile(join(root, "output/nested/hello.d.ts"), "utf8")).includes("export {};"))
})
test("workspace CLI returns structured compiler errors and nonzero exit code", async (context) => {
  const root = await fixture(context, { "bad.ts": 'const age: number = "18";' })
  const result = await execa(
    process.execPath,
    ["--conditions=development", cli, "check", "bad.ts"],
    { cwd: root, timeout: 5000, reject: false }
  )
  assert.equal(result.exitCode, 1)
  assert.equal(JSON.parse(result.stderr)[0].code, "T001")
})
