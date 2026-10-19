import { expect, test } from "vitest"
import { execa } from "execa"

// A fresh Node process resolves the default package export without Vitest's development condition.
test("built package and subpath exports execute in Node", async () => {
  const { stdout } = await execa(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `import assert from "node:assert/strict"
import { compile } from "@soppy-index/compiler"
import { CompileError } from "@soppy-index/compiler/model"
assert.match(compile({ file: "probe.ts", text: "const x = 1;" }).code, /const x = 1;/)
assert.throws(() => compile({ file: "invalid.ts", text: 'const x: number = "bad";' }), CompileError)
console.log("Built workspace entries passed")`,
    ],
    { timeout: 5000 }
  )
  expect(stdout).toBe("Built workspace entries passed")
})
