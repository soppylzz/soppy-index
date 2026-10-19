import { describe, expect, it } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe.each(["constructor", "chain"])("04 result resolution via %s", (entry) => {
  const adopt = (value: unknown) =>
    entry === "constructor"
      ? new MyPromise((resolve) => resolve(value))
      : new MyPromise((resolve) => resolve(0)).then(() => value)

  it("waits for a pending subject promise", async () => {
    const inner = deferred<number>()
    const outer = adopt(inner.promise)
    await expectPending(outer)
    inner.resolve(21)
    await expect(outer).resolves.toBe(21)
  })

  it("adopts rejection from another promise", async () => {
    const inner = deferred<number>()
    const outer = adopt(inner.promise)
    const check = expect(outer).rejects.toBe("inner failure")
    inner.reject("inner failure")
    await check
  })

  it("interoperates with a native promise", async () => {
    await expect(adopt(Promise.resolve(22))).resolves.toBe(22)
  })

  it("recursively adopts nested thenables", async () => {
    const inner = {
      then(resolve: (value: number) => void) {
        resolve(23)
      },
    }
    const outer = {
      then(resolve: (value: unknown) => void) {
        resolve(inner)
      },
    }
    await expect(adopt(outer)).resolves.toBe(23)
  })

  it("supports callable objects with a then method", async () => {
    const callable = Object.assign(() => {}, {
      then(resolve: (value: number) => void) {
        resolve(24)
      },
    })
    await expect(adopt(callable)).resolves.toBe(24)
  })

  it("treats a non-callable then property as an ordinary value", async () => {
    const value = { then: 42 }
    await expect(adopt(value)).resolves.toBe(value)
  })

  it("reads then only once and preserves its receiver", async () => {
    let reads = 0
    const value = {
      get then() {
        reads += 1
        return function (this: unknown, resolve: (value: number) => void) {
          expect(this).toBe(value)
          resolve(25)
        }
      },
    }
    await expect(adopt(value)).resolves.toBe(25)
    expect(reads).toBe(1)
  })

  it("rejects if reading then throws", async () => {
    const error = new Error("getter failed")
    const value = {
      get then() {
        throw error
      },
    }
    await expect(adopt(value)).rejects.toBe(error)
  })

  it("rejects if calling then throws before notification", async () => {
    const error = new Error("then failed")
    await expect(
      adopt({
        then() {
          throw error
        },
      })
    ).rejects.toBe(error)
  })

  it("ignores repeated notifications and an exception after fulfillment", async () => {
    const value = {
      then(resolve: (value: number) => void, reject: (reason: unknown) => void) {
        resolve(26)
        reject("late failure")
        resolve(27)
        throw new Error("late exception")
      },
    }
    await expect(adopt(value)).resolves.toBe(26)
  })

  it("ignores fulfillment and exceptions after a thenable rejects", async () => {
    const value = {
      then(resolve: (value: number) => void, reject: (reason: unknown) => void) {
        reject("first failure")
        resolve(28)
        throw new Error("late exception")
      },
    }
    await expect(adopt(value)).rejects.toBe("first failure")
  })

  it("locks a thenable's first notification even while its result is pending", async () => {
    const inner = deferred<number>()
    const value = {
      then(resolve: (value: unknown) => void, reject: (reason: unknown) => void) {
        resolve(inner.promise)
        reject("late failure")
        resolve(99)
      },
    }
    const outer = adopt(value)
    await expectPending(outer)
    inner.resolve(29)
    await expect(outer).resolves.toBe(29)
  })
})

describe("04 resolution locks and self-reference", () => {
  it.each(["fulfill", "reject"])(
    "locks constructor resolve while the adopted promise will %s",
    async (outcome) => {
      const inner = deferred<number>()
      const outer = new MyPromise((resolve, reject) => {
        resolve(inner.promise)
        reject("late rejection")
        resolve(99)
        throw new Error("late exception")
      })
      await expectPending(outer)
      if (outcome === "fulfill") {
        inner.resolve(30)
        await expect(outer).resolves.toBe(30)
      } else {
        const check = expect(outer).rejects.toBe("inner failure")
        inner.reject("inner failure")
        await check
      }
    }
  )

  it("rejects resolving a promise with itself", async () => {
    const task = deferred<unknown>()
    task.resolve(task.promise)
    await expect(task.promise).rejects.toBeInstanceOf(TypeError)
  })

  it("rejects a handler returning the very promise created by then", async () => {
    const task = deferred<number>()
    const next: Promise<unknown> = task.promise.then(() => next)
    task.resolve(1)
    await expect(next).rejects.toBeInstanceOf(TypeError)
  })
})
