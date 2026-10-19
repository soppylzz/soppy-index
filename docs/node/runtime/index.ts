import assert from "node:assert/strict"
import { log, runLab, runNode } from "../lab.ts"

await runLab("runtime", async () => {
  log("components", {
    v8: process.versions.v8,
    uv: process.versions.uv,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
  })
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
