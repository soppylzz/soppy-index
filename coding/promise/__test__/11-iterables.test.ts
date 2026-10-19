import { describe, expect, it } from "vitest"
import { MyPromise } from "./helpers.ts"

describe.each(["all", "race", "allSettled", "any"] as const)(
  "11 %s iterable contracts",
  (method) => {
    const invoke = (input: Iterable<unknown>) =>
      (MyPromise[method] as (input: Iterable<unknown>) => Promise<unknown>).call(MyPromise, input)
    it("accepts a Set", async () => {
      const result = invoke(new Set([10, 11]))
      const expected =
        method === "all"
          ? [10, 11]
          : method === "allSettled"
            ? [
                { status: "fulfilled", value: 10 },
                { status: "fulfilled", value: 11 },
              ]
            : 10
      await expect(result).resolves.toEqual(expected)
    })

    it("accepts a generator", async () => {
      function* values() {
        yield 12
        yield 13
      }
      const result = invoke(values())
      const expected =
        method === "all"
          ? [12, 13]
          : method === "allSettled"
            ? [
                { status: "fulfilled", value: 12 },
                { status: "fulfilled", value: 13 },
              ]
            : 12
      await expect(result).resolves.toEqual(expected)
    })

    it("returns a rejection for non-iterable input instead of throwing synchronously", async () => {
      const result = invoke(42 as never)
      await expect(result).rejects.toBeInstanceOf(TypeError)
    })

    it("rejects if retrieving the iterator throws", async () => {
      const error = new Error("iterator getter failed")
      const input = {
        get [Symbol.iterator]() {
          throw error
        },
      }
      await expect(invoke(input as never)).rejects.toBe(error)
    })

    it("rejects if iteration throws before any input settles", async () => {
      const error = new Error("iteration failed")
      function* values() {
        yield 14
        throw error
      }
      await expect(invoke(values())).rejects.toBe(error)
    })
  }
)
