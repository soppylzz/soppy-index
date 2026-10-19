import assert from "node:assert/strict"
import { test } from "vitest"
import { TraceMap, originalPositionFor } from "@jridgewell/trace-mapping"
import { analyze, compile } from "@soppy-index/compiler/compiler"
import { emitDeclarations } from "@soppy-index/compiler/declarations"
import { CompileError } from "@soppy-index/compiler/model"
import { locate } from "@soppy-index/test"
function assertOrigin(
  code: string,
  map: ConstructorParameters<typeof TraceMap>[0],
  needle: string,
  sourceText: string,
  originalNeedle: string,
  occurrence = 0,
  originalOccurrence = 0
): void {
  const generated = locate(code, needle, occurrence),
    expected = locate(sourceText, originalNeedle, originalOccurrence)
  const original = originalPositionFor(new TraceMap(map), generated)
  assert.equal(original.line, expected.line)
  assert.equal(original.column, expected.column)
  assert.equal(original.source, "original.ts")
}
const text =
  'export const greeting: string = "Hello, ";\nexport const greet = (name: string): string => greeting + name;\nconsole.log(greet("world"));\n'
test("JS map: declaration name, transformed function body and call point return to original TS", () => {
  const result = compile({ file: "original.ts", text }, { target: "legacy" }, "hello.js")
  assert.equal(result.map.version, 3)
  assert.equal(result.map.file, "hello.js")
  assert.deepEqual(result.map.sourcesContent, [text])
  assert.match(result.code, /sourceMappingURL=hello.js.map/)
  assertOrigin(result.code, result.map, "greeting", text, "greeting")
  assertOrigin(result.code, result.map, "(greeting + name)", text, "greeting + name")
  assertOrigin(result.code, result.map, 'greet)("world")', text, 'greet("world")')
  assert.equal(
    originalPositionFor(new TraceMap(result.map), locate(result.code, "function")).source,
    null
  )
  assert.equal(
    originalPositionFor(new TraceMap(result.map), locate(result.code, "return")).source,
    null
  )
})
test("declaration map: exported names and parameter names map to their source definitions", () => {
  const analysis = analyze({ file: "original.ts", text })
  const result = emitDeclarations(analysis, "hello.d.ts")
  assert.match(result.code, /export declare const greeting: string;/)
  assert.match(result.code, /export declare const greet: \(name: string\) => string;/)
  assert.doesNotMatch(result.code, /Hello|console|return/)
  assert.match(result.code, /sourceMappingURL=hello.d.ts.map/)
  assertOrigin(result.code, result.map, "greet:", text, "greet =")
  assertOrigin(result.code, result.map, "name:", text, "name:")
  assert.equal(
    originalPositionFor(new TraceMap(result.map), locate(result.code, "declare")).source,
    null
  )
})
test("declaration types come from inference; unsupported function aliases/types fail explicitly", () => {
  const analysis = analyze({
    file: "original.ts",
    text: "export const count = 1; export const add = (x: number) => x + count;",
  })
  assert.match(emitDeclarations(analysis, "x.d.ts").code, /count: number;/)
  const alias = analyze({
    file: "original.ts",
    text: "const f = (x: number) => x; export const alias = f;",
  })
  assert.throws(() => emitDeclarations(alias, "x.d.ts"), CompileError)
})
