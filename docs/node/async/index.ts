import assert from "node:assert/strict"
import { setTimeout as delay } from "node:timers/promises"
import { AsyncLocalStorage } from "node:async_hooks"
import { log, runLab } from "../lab.ts"

await runLab("async", async () => {
  let active = 0
  let peak = 0
  const pending = Array.from({ length: 6 }, (_, index) => index)
  const completed: number[] = []
  async function consume(): Promise<void> {
    while (pending.length) {
      const task = pending.shift()!
      active++
      peak = Math.max(peak, active)
      try {
        await delay(5)
        completed.push(task)
      } finally {
        active--
      }
    }
  }
  await Promise.all([consume(), consume()])
  assert.equal(peak, 2)
  assert.equal(completed.length, 6)
  log("bounded-concurrency", { peak, completed })
  const controller = new AbortController()
  let cleaned = false
  const operation = delay(1000, "late", { signal: controller.signal }).finally(() => {
    cleaned = true
  })
  const deadline = setTimeout(() => controller.abort(), 10)
  try {
    await assert.rejects(operation, { name: "AbortError" })
  } finally {
    clearTimeout(deadline)
  }
  assert.equal(cleaned, true)
  log("deadline-cancels-operation", { aborted: controller.signal.aborted, cleaned })
  const storage = new AsyncLocalStorage<{ requestId: string }>()
  try {
    const observed = await Promise.all(
      ["request-a", "request-b"].map((requestId, index) =>
        storage.run({ requestId }, async () => {
          await delay(index ? 2 : 8)
          assert.equal(storage.getStore()?.requestId, requestId)
          return storage.getStore()!.requestId
        })
      )
    )
    assert.equal(storage.getStore(), undefined)
    log("isolated-async-contexts", { observed, outsideStore: storage.getStore() ?? null })
  } finally {
    storage.disable()
  }
})
