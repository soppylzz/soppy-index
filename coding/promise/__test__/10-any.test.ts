import { describe, expect, it } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe("10 any", () => {
  it("ignores early rejections and waits for a fulfillment", async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const result = MyPromise.any([first.promise, second.promise])
    expect(result).toBeInstanceOf(MyPromise)
    first.reject("early failure")
    await expectPending(result)
    second.resolve(7)
    await expect(result).resolves.toBe(7)
  })

  it("uses the first fulfillment rather than input order", async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const result = MyPromise.any([first.promise, second.promise])
    second.resolve("winner")
    await expect(result).resolves.toBe("winner")
    first.resolve("late")
    await expect(result).resolves.toBe("winner")
  })

  it("aggregates rejection reasons in input order", async () => {
    const first = deferred<number>()
    const second = deferred<number>()
    const result = MyPromise.any([first.promise, second.promise])
    const check = expect(result).rejects.toMatchObject({ errors: ["first", "second"] })
    second.reject("second")
    first.reject("first")
    await check
    await expect(result).rejects.toBeInstanceOf(AggregateError)
  })

  it("rejects empty input with an empty AggregateError", async () => {
    const result = MyPromise.any([])
    await expect(result).rejects.toBeInstanceOf(AggregateError)
    await expect(result).rejects.toMatchObject({ errors: [] })
  })

  it("accepts plain values and external thenables", async () => {
    await expect(MyPromise.any([8])).resolves.toBe(8)
    const thenable = {
      then(resolve: (value: number) => void) {
        resolve(9)
      },
    }
    await expect(MyPromise.any([thenable])).resolves.toBe(9)
  })
})
