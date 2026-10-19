import assert from "node:assert/strict"
import { runWasm } from "./wasm.mjs"
import { log, runLab } from "../lab.ts"

await runLab("extensions", async () => {
  const result = await runWasm()
  assert.equal(result.result, 42)
  log("actual-wasm-execution", {
    ...result,
    nativeAddonBuilt: false,
  })
})
