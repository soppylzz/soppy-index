import assert from "node:assert/strict"
import { EventEmitter, once } from "node:events"
import { log, runLab } from "../lab.ts"

await runLab("events", async () => {
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
})
