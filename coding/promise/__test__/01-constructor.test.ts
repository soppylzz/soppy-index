import { describe, expect, it } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe("01 constructor and settlement", () => {
  it("runs the executor synchronously exactly once", () => {
    const events: string[] = []
    new MyPromise(() => {
      events.push("executor")
    })
    events.push("after construction")
    expect(events).toEqual(["executor", "after construction"])
  })

  it("provides callable resolve and reject controls", () => {
    new MyPromise((resolve, reject) => {
      expect(typeof resolve).toBe("function")
      expect(typeof reject).toBe("function")
    })
  })

  it("stays pending until notified", async () => {
    await expectPending(new MyPromise(() => {}))
  })

  it.each([undefined, null, false, 0, "", 42])("fulfills with %s", async (value) => {
    await expect(new MyPromise((resolve) => resolve(value))).resolves.toBe(value)
  })

  it("preserves object identity", async () => {
    const value = { count: 1 }
    await expect(new MyPromise((resolve) => resolve(value))).resolves.toBe(value)
  })

  it.each([undefined, null, false, 0, "failure"])("rejects with %s", async (reason) => {
    await expect(new MyPromise((_, reject) => reject(reason))).rejects.toBe(reason)
  })

  it("turns an executor exception into rejection", async () => {
    const error = new Error("executor failed")
    await expect(
      new MyPromise(() => {
        throw error
      })
    ).rejects.toBe(error)
  })

  it("keeps the first fulfillment despite later calls and exceptions", async () => {
    const promise = new MyPromise((resolve, reject) => {
      resolve("first")
      resolve("second")
      reject("late failure")
      throw new Error("late exception")
    })
    await expect(promise).resolves.toBe("first")
  })

  it("keeps the first rejection despite later calls", async () => {
    const promise = new MyPromise((resolve, reject) => {
      reject("first")
      resolve("late success")
      reject("second")
    })
    await expect(promise).rejects.toBe("first")
  })

  it("allows settlement after the executor returns", async () => {
    const task = deferred<number>()
    task.resolve(7)
    await expect(task.promise).resolves.toBe(7)
  })

  it("rejects a non-callable executor", () => {
    expect(() => new MyPromise(null as never)).toThrow(TypeError)
  })
})
