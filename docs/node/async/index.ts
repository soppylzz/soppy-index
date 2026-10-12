import assert from "node:assert/strict"
import { setTimeout as delay } from "node:timers/promises"
import { EventEmitter, once } from "node:events"
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
  const emitter = new EventEmitter({ captureRejections: true })
  const order: string[] = []
  const first = () => {
    order.push("listener-first")
  }
  const second = () => {
    order.push("listener-second")
  }
  emitter.on("message", first).on("message", second)
  order.push("before-emit")
  const hadListeners = emitter.emit("message")
  order.push("after-emit")
  assert.deepEqual(order, ["before-emit", "listener-first", "listener-second", "after-emit"])
  log("synchronous-emitter", { order, hadListeners })
  const failure = once(emitter, "error")
  emitter.on("task", async () => {
    throw new Error("Expected task rejection")
  })
  emitter.emit("task")
  const [error] = (await failure) as [Error]
  assert.equal(error.message, "Expected task rejection")
  emitter.removeAllListeners()
  assert.equal(emitter.listenerCount("message"), 0)
  log("emitter-rejection-and-cleanup", {
    error: error.message,
    listeners: emitter.eventNames().length,
  })
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
