import { execa } from "execa"
import { fileURLToPath } from "node:url"
const cwd = fileURLToPath(new URL("../", import.meta.url))
try {
  await execa(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      'import assert from "node:assert/strict"; import { compile } from "@soppy-index/compiler"; assert.match(compile({file:"probe.ts",text:"const x = 1;"}).code, /const x = 1;/); console.log("Built workspace entry passed");',
    ],
    { cwd, stdio: "inherit", timeout: 5000 }
  )
} catch (error) {
  console.error((error as Error).message)
  process.exitCode = 1
}
