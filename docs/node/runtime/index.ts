import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { log, runLab, runNode } from "../lab.ts"

await runLab("runtime", async () => {
  log("components", {
    v8: process.versions.v8,
    uv: process.versions.uv,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
  })
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
  const { stdout } = await runNode([
    "--input-type=module",
    "-e",
    `process.on('beforeExit',()=>console.log('beforeExit'));process.on('exit',()=>console.log('exit'));process.exitCode=0;console.log('body')`,
  ])
  assert.deepEqual(stdout.trim().split("\n"), ["body", "beforeExit", "exit"])
  log("natural-exit", {
    events: stdout.trim().split("\n"),
    cwd: process.cwd(),
    falseStringIsTruthy: Boolean("false"),
  })
  try {
    await runNode(["-e", "process.exitCode=7"])
    assert.fail("Expected nonzero exit")
  } catch (error) {
    assert.equal((error as { code: number }).code, 7)
    log("nonzero-exit", { code: 7, observedByParent: true })
  }
})
