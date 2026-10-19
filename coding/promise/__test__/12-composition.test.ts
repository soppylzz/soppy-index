import { describe, expect, it, vi } from "vitest"
import { MyPromise } from "./helpers.ts"

describe("12 composed methods", () => {
  it("supports catch and finally on a promise returned by then", async () => {
    const cleanup = vi.fn()
    const result = MyPromise.resolve(1)
      .then(() => {
        throw "failure"
      })
      .catch(() => 2)
      .finally(cleanup)
      .then((value) => value + 1)

    expect(result).toBeInstanceOf(MyPromise)
    await expect(result).resolves.toBe(3)
    expect(cleanup).toHaveBeenCalledExactlyOnceWith()
  })

  it("allows recovery after a combinator rejects", async () => {
    const result = MyPromise.all([MyPromise.reject("failure"), 1])
      .catch(() => [2, 3])
      .then((values) => values.reduce((sum, value) => sum + value, 0))

    await expect(result).resolves.toBe(5)
  })

  it("adopts a rejecting cleanup thenable and allows subsequent recovery", async () => {
    const cleanup = {
      then(_: unknown, reject: (reason: unknown) => void) {
        reject("cleanup failure")
      },
    }
    const result = MyPromise.resolve("original")
      .finally(() => cleanup)
      .catch((reason: unknown) => reason)

    await expect(result).resolves.toBe("cleanup failure")
  })

  it("passes rejection through a non-function catch handler", async () => {
    await expect(MyPromise.reject("failure").catch(42 as never)).rejects.toBe("failure")
  })
})
