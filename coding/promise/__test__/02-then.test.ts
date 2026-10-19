import { describe, expect, it, vi } from "vitest"
import { MyPromise, deferred } from "./helpers.ts"

describe("02 subscriptions and scheduling", () => {
  it("notifies an early fulfillment subscriber", async () => {
    const task = deferred<number>()
    const success = vi.fn((value: number) => value)
    const failure = vi.fn()
    const next = task.promise.then(success, failure)
    expect(success).not.toHaveBeenCalled()
    task.resolve(12)
    await next
    expect(success).toHaveBeenCalledExactlyOnceWith(12)
    expect(failure).not.toHaveBeenCalled()
  })

  it("notifies an early rejection subscriber", async () => {
    const task = deferred<number>()
    const success = vi.fn()
    const failure = vi.fn()
    const next = task.promise.then(success, failure)
    task.reject("failure")
    await next
    expect(failure).toHaveBeenCalledExactlyOnceWith("failure")
    expect(success).not.toHaveBeenCalled()
  })

  it("notifies late subscribers on either branch", async () => {
    const success = new MyPromise((resolve) => resolve(3))
    const failure = new MyPromise((_, reject) => reject("failure"))
    await expect(success.then((value) => value)).resolves.toBe(3)
    await expect(failure.then(undefined, (reason) => reason)).resolves.toBe("failure")
  })

  it.each(["fulfilled", "rejected"])("queues %s handlers as microtasks", async (state) => {
    const events: string[] = []
    const task = deferred<number>()
    const result = task.promise.then(
      () => {
        events.push("handler")
      },
      () => {
        events.push("handler")
      }
    )
    queueMicrotask(() => events.push("before settlement"))
    if (state === "fulfilled") task.resolve(1)
    else task.reject("failure")
    queueMicrotask(() => events.push("after settlement"))
    expect(events).toEqual([])
    await result
    expect(events).toEqual(["before settlement", "handler", "after settlement"])
  })

  it("does not call a late handler synchronously", async () => {
    const promise = new MyPromise((resolve) => resolve(1))
    const events: string[] = []
    const next = promise.then(() => {
      events.push("handler")
    })
    events.push("sync")
    expect(events).toEqual(["sync"])
    await next
    expect(events).toEqual(["sync", "handler"])
  })

  it.each(["fulfilled", "rejected"])("preserves subscription order for %s", async (state) => {
    const task = deferred<number>()
    const events: number[] = []
    const subscriptions = [1, 2, 3].map((id) =>
      task.promise.then(
        () => {
          events.push(id)
        },
        () => {
          events.push(id)
        }
      )
    )
    if (state === "fulfilled") task.resolve(1)
    else task.reject("failure")
    await Promise.all(subscriptions)
    expect(events).toEqual([1, 2, 3])
  })

  it("does not replay an earlier subscription when a new one is added", async () => {
    const task = deferred<number>()
    const first = vi.fn()
    const subscribed = task.promise.then(first)
    task.resolve(1)
    await subscribed
    await task.promise.then(() => {})
    expect(first).toHaveBeenCalledTimes(1)
  })
})
