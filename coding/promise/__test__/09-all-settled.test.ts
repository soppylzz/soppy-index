import { describe, expect, it } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe("09 allSettled", () => {
  it("records both outcomes in input order", async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const result = MyPromise.allSettled([first.promise, second.promise, 6])
    expect(result).toBeInstanceOf(MyPromise)
    second.reject("failure")
    await expectPending(result)
    first.resolve("success")
    await expect(result).resolves.toEqual([
      { status: "fulfilled", value: "success" },
      { status: "rejected", reason: "failure" },
      { status: "fulfilled", value: 6 },
    ])
  })

  it("fulfills even when every input rejects", async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const result = MyPromise.allSettled([first.promise, second.promise])
    first.reject("first")
    second.reject("second")
    await expect(result).resolves.toEqual([
      { status: "rejected", reason: "first" },
      { status: "rejected", reason: "second" },
    ])
  })

  it("fulfills with an empty array for empty input", async () => {
    await expect(MyPromise.allSettled([])).resolves.toEqual([])
  })

  it("records a then getter exception as an individual rejection", async () => {
    const error = new Error("getter failed")
    const input = {
      get then() {
        throw error
      },
    }
    await expect(MyPromise.allSettled([input])).resolves.toEqual([
      { status: "rejected", reason: error },
    ])
  })
})
