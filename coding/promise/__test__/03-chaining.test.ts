import { describe, expect, it } from "vitest"
import { MyPromise, deferred } from "./helpers.ts"

describe("03 chaining and propagation", () => {
  it("returns a distinct subject instance for each then call", () => {
    const source = new MyPromise((resolve) => resolve(1))
    const first = source.then()
    const second = source.then()
    expect(first).toBeInstanceOf(MyPromise)
    expect(first).not.toBe(source)
    expect(second).not.toBe(first)
  })

  it("passes each handler result to the next link", async () => {
    const source = new MyPromise<number>((resolve) => resolve(2))
    await expect(source.then((value) => value * 3).then((value) => value + 1)).resolves.toBe(7)
    await expect(source).resolves.toBe(2)
  })

  it("fulfills with undefined when a handler returns nothing", async () => {
    await expect(new MyPromise((resolve) => resolve(1)).then(() => {})).resolves.toBeUndefined()
  })

  it.each([undefined, null, 42, "ignored", {}])(
    "ignores a non-function handler: %s",
    async (handler) => {
      const success = new MyPromise((resolve) => resolve(8))
      const failure = new MyPromise((_, reject) => reject("failure"))
      await expect(success.then(handler as never)).resolves.toBe(8)
      await expect(failure.then(undefined, handler as never)).rejects.toBe("failure")
    }
  )

  it("rejects the next promise if a success handler throws", async () => {
    const error = new Error("handler failed")
    await expect(
      new MyPromise((resolve) => resolve(1)).then(() => {
        throw error
      })
    ).rejects.toBe(error)
  })

  it("allows a rejection handler to recover with a value", async () => {
    await expect(
      new MyPromise((_, reject) => reject("failure")).then(undefined, () => 9)
    ).resolves.toBe(9)
  })

  it("keeps propagating an exception thrown by a rejection handler", async () => {
    const error = new Error("replacement failure")
    await expect(
      new MyPromise((_, reject) => reject("original")).then(undefined, () => {
        throw error
      })
    ).rejects.toBe(error)
  })

  it("keeps sibling chains independent", async () => {
    const task = deferred<number>()
    const first = task.promise.then(() => {
      throw "branch failure"
    })
    const second = task.promise.then((value) => value + 1)
    const firstCheck = expect(first).rejects.toBe("branch failure")
    task.resolve(10)
    await firstCheck
    await expect(second).resolves.toBe(11)
  })
})
