import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { test } from "node:test"
import { runInNewContext } from "node:vm"
import { analyze, compile } from "@soppy-index/compiler/compiler"
import { scan } from "@soppy-index/compiler/lexer"
import { CompileError, type CompileOptions } from "@soppy-index/compiler/model"
import { parse } from "@soppy-index/compiler/parser"
import { walk } from "@soppy-index/compiler/visitor"
const source = (text: string) => ({ file: "fixture.ts", text })
function run(text: string, options: CompileOptions = {}): { code: string; output: unknown[][] } {
  const result = compile(source(text), options)
  const output: unknown[][] = []
  runInNewContext(result.code, { console: { log: (...args: unknown[]) => output.push(args) } })
  return { code: result.code, output }
}
function errors(text: string): CompileError {
  try {
    compile(source(text))
    assert.fail("Expected compilation to fail")
  } catch (error) {
    assert.ok(error instanceof CompileError)
    return error
  }
}
test("scanner positions, raw text, CRLF, decoded escape and UTF-16 columns", () => {
  const tokens = scan(source('// comment\r\n/* block */ const x = "😀\\n";'))
  assert.equal(tokens[0].text, "const")
  assert.deepEqual(tokens[0].start, { offset: 24, line: 1, column: 12 })
  const string = tokens.find((t) => t.kind === "string")!
  assert.equal(string.value, "😀\n")
  assert.equal(string.end.column - string.start.column, 6)
  for (const token of tokens)
    assert.equal(
      token.text,
      '// comment\r\n/* block */ const x = "😀\\n";'.slice(token.start.offset, token.end.offset)
    )
})
test("scanner rejects unknown escapes, unfinished strings/comments and nondecimal numeric syntax", () => {
  for (const text of [
    '"\\u0061";',
    '"\\',
    "/*",
    "const x = 0x10;",
    "const x = 01;",
    "const x = 08;",
    "const x = 1e2;",
    "const x = `x`;",
  ])
    assert.throws(() => parse(source(text)), CompileError)
})
test("AST preserves groups, left-associative plus and parameter/return annotations", () => {
  const ast = parse(source("const f = (x: number): number => (x + 1) + 2;"))
  const variable = ast.statements[0]
  assert.equal(variable.kind, "Variable")
  if (variable.kind !== "Variable" || variable.init.kind !== "Arrow") assert.fail()
  assert.equal(variable.annotation, undefined)
  assert.equal(variable.init.params[0].annotation?.name, "number")
  assert.equal(variable.init.annotation?.name, "number")
  assert.equal(variable.init.body.kind, "Binary")
  const nodes: string[] = []
  walk(ast, (n) => nodes.push(n.kind))
  assert.ok(nodes.includes("Group"))
})
test("hello TS and JS execute after independent legacy passes; original AST survives", async () => {
  for (const language of ["ts", "js"] as const) {
    const text = await readFile(
      new URL(`./fixtures/hello.${language}.mini`, import.meta.url),
      "utf8"
    )
    const result = compile(source(text), { language, target: "legacy" })
    assert.deepEqual(run(text, { language, target: "legacy" }).output, [["Hello, world"]])
    assert.match(result.code, /var greet = function/)
    assert.doesNotMatch(result.code, /=>|: string/)
    assert.deepEqual(
      result.transformed.passes.map((p) => p.name),
      ["erase-types", "lower-arrows", "lower-constants"]
    )
    const original = result.ast.statements[1]
    assert.ok(original.kind === "Variable" && original.init.kind === "Arrow")
    assert.equal(Boolean(original.init.params[0].annotation), language === "ts")
  }
})
test("modern target keeps arrows/constants and erases only types", () => {
  const result = run("const f = (x: number) => x + 1; console.log(f(2));")
  assert.match(result.code, /const f = \(x\) =>/)
  assert.deepEqual(result.output, [[3]])
})
test("binding resolves lexical closure and parameter shadowing to different symbols", () => {
  const text =
    "const x: number = 10; const f = (x: number) => (y: number) => x + y; console.log(f(2)(3));"
  const analysis = analyze(source(text))
  assert.equal(analysis.binding.scopes.length, 3)
  const refs = [...analysis.binding.references].filter(([name]) => name.name === "x")
  assert.equal(refs[0][1].kind, "parameter")
  assert.deepEqual(run(text, { target: "legacy" }).output, [[5]])
})
test("combined error fixture has binder and checker diagnostics with exact source range", async () => {
  const text = await readFile(new URL("./fixtures/type-errors.mini", import.meta.url), "utf8")
  const diagnostics = errors(text).diagnostics
  assert.deepEqual(diagnostics.map((d) => d.code).sort(), ["B002", "T001", "T003"])
  const missing = diagnostics.find((d) => d.code === "B002")!
  assert.equal(missing.phase, "binder")
  assert.equal(missing.file, "fixture.ts")
  assert.equal(text.slice(missing.start.offset, missing.end.offset), "missing")
  assert.deepEqual(missing.start, { offset: text.indexOf("missing"), line: 3, column: 12 })
})
for (const [label, text, code] of [
  ["duplicate variable", "const a = 1; const a = 2;", "B001"],
  ["duplicate parameter", "const f = (x: number, x: number) => x;", "B001"],
  ["missing variable", "console.log(missing);", "B002"],
  ["TDZ", "console.log(a); const a = 1;", "B003"],
  ["self-reference", "const a = a;", "B003"],
  ["recursion", "const f = (x: number): number => f(x);", "B003"],
  ["deferred forward capture", "const f = () => later; const later = 1;", "B003"],
  ["argument count", "const f = (x: string) => x; f();", "T002"],
  ["argument type", "const f = (x: string) => x; f(1);", "T003"],
  ["return type", "const f = (): number => true;", "T004"],
  ["mixed plus", 'const x = "a" + 1;', "T005"],
  ["boolean plus", "const x = true + false;", "T005"],
  ["noncallable", "const a = 1; a();", "T006"],
] as const)
  test(`diagnostic: ${label}`, () =>
    assert.ok(errors(text).diagnostics.some((d) => d.code === code)))
test("unsupported grammar cannot silently emit code", () => {
  for (const text of [
    "const a = 1",
    "const a;",
    "const f = x => x;",
    "const f = (x) => x;",
    "const f = () => { 1; };",
    "const f = (x: number)\n=> x;",
    "const a = new Thing();",
    "const f = () => this;",
    "const f = () => arguments;",
    "const a = 1; a = 2;",
    "console.warn(1);",
    "const c = console;",
    "const a = [1];",
    'import { a as b } from "./a";',
    "export default 1;",
  ])
    assert.throws(() => compile(source(text)), CompileError, text)
})
test("syntax error fixture reports the missing semicolon at next statement", async () => {
  const text = await readFile(new URL("./fixtures/syntax-error.mini", import.meta.url), "utf8")
  assert.equal(errors(text).diagnostics[0].start.line, 1)
})
test("JS mode rejects annotations and still enforces binding", () => {
  assert.throws(() => compile(source("const x: number = 1;"), { language: "js" }), CompileError)
  assert.throws(
    () =>
      compile(source("const f = () => later; const later = 1;"), {
        language: "js",
        target: "legacy",
      }),
    CompileError
  )
})
test("syntax target and module format are independent; CJS generated names cannot collide", () => {
  const result = compile(source("export const f = (x: number) => x;"), {
    format: "cjs",
    target: "modern",
  })
  assert.match(result.code, /const f = \(x\) =>/)
  assert.match(result.code, /Object.defineProperty/)
  assert.throws(() => compile(source("const require = 1;"), { format: "cjs" }), CompileError)
  assert.match(
    compile(source("export const f = (x: number) => x;"), { format: "esm", target: "legacy" }).code,
    /export var f = function/
  )
})

test("single-file compilation rejects all unresolved imports, including side-effect-only paths", () => {
  assert.throws(() => compile(source('import "./effect.ts";')), /Imports require loadGraph/)
})

test("JS rejects bare arrows in plus operands and observable function coercion/callbacks", () => {
  for (const text of [
    "const x = 1 + (n) => n;",
    'const f = () => 1; console.log(f + "");',
    "const id = (x) => x; id(() => 1);",
    "const f = (x) => x(); f(1);",
  ]) {
    assert.throws(() => compile(source(text), { language: "js", target: "legacy" }), CompileError)
  }
  assert.deepEqual(
    run("const id = (x) => x; console.log(id(1));", { language: "js", target: "legacy" }).output,
    [[1]]
  )
})
