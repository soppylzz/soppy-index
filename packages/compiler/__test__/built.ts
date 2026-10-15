import assert from "node:assert/strict"
import { compile } from "@soppy-index/compiler"

assert.match(compile({ file: "probe.ts", text: "const x = 1;" }).code, /const x = 1;/)
console.log("Built workspace entry passed")
