import { runWasm } from "./wasm.mjs"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { log, runLab, runNode } from "../lab.ts"

await runLab("tooling", async () => {
  const { stdout } = await runNode([
    "--test",
    "--test-reporter=tap",
    fileURLToPath(new URL("./lesson.test.mjs", import.meta.url)),
  ])
  assert.match(stdout, /# pass 3/)
  assert.match(stdout, /# fail 0/)
  log("real-node-test-runner", { output: stdout })
  const result = await runWasm()
  assert.equal(result.result, 42)
  log("actual-wasm-execution", {
    ...result,
    nativeAddonBuilt: false,
  })
})
