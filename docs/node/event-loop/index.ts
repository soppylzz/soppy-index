import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { log, runLab, runNode } from "../lab.ts"

await runLab("event-loop", async () => {
  for (const format of ["cjs", "mjs"]) {
    const { stdout } = await runNode([fileURLToPath(new URL(`./queue.${format}`, import.meta.url))])
    const traces = stdout
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as { context: string; event: string })
    const top = traces.filter((item) => item.context === "top").map((item) => item.event)
    const io = traces.filter((item) => item.context === "io").map((item) => item.event)
    assert.deepEqual(
      top.slice(0, 4),
      format === "cjs"
        ? ["sync", "nextTick", "promise", "microtask"]
        : ["sync", "promise", "microtask", "nextTick"]
    )
    assert(io.indexOf("immediate") < io.indexOf("timer"))
    log("real-queue-trace", { format, traces })
  }
})
