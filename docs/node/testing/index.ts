import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { log, runLab, runNode } from "../lab.ts"

await runLab("testing", async () => {
  const { stdout } = await runNode([
    "--test",
    "--test-reporter=tap",
    fileURLToPath(new URL("./__test__/lesson.test.mjs", import.meta.url)),
  ])
  assert.match(stdout, /# pass 3/)
  assert.match(stdout, /# fail 0/)
  log("real-node-test-runner", { output: stdout })
})
