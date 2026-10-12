import assert from "node:assert/strict"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { log, runLab, runNode } from "../lab.ts"

await runLab("modules", async () => {
  const require = createRequire(import.meta.url)
  const first = require("./fixtures/state.cjs") as { count: number }
  const second = require("./fixtures/state.cjs") as { count: number }
  first.count++
  assert.equal(first, second)
  assert.equal(second.count, 1)
  log("cjs-cache", { sameObject: first === second, count: second.count })
  const esm = await import("./fixtures/state.mjs")
  esm.increment()
  const again = await import("./fixtures/state.mjs")
  assert.equal(esm, again)
  assert.equal(esm.count, 1)
  log("esm-live-binding", { sameNamespace: esm === again, count: esm.count })
  const syncEsm = require("./fixtures/state.mjs") as { count: number }
  assert.equal(syncEsm.count, 1)
  assert.throws(() => require("./fixtures/await.mjs"), { code: "ERR_REQUIRE_ASYNC_MODULE" })
  log("require-esm-boundary", { syncGraph: "accepted", topLevelAwait: "ERR_REQUIRE_ASYNC_MODULE" })
  const packageResult = JSON.parse(
    (await runNode([fileURLToPath(new URL("./fixtures/package/probe.mjs", import.meta.url))]))
      .stdout
  )
  assert.deepEqual(packageResult, {
    value: "esm-entry",
    internalValue: "esm-entry",
    required: "cjs-entry",
    rejection: "ERR_PACKAGE_PATH_NOT_EXPORTED",
  })
  log("package-resolution", packageResult)
  const typed = JSON.parse(
    (await runNode([fileURLToPath(new URL("./fixtures/typed.ts", import.meta.url))])).stdout
  )
  assert.equal(typed.value, 42)
  log("native-type-stripping", typed)
})
