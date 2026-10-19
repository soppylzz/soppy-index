import { describe, expect, it } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe("08 race", () => {
  it("returns a subject instance", async () => {
    const result = MyPromise.race([1])
    expect(result).toBeInstanceOf(MyPromise)
    await expect(result).resolves.toBe(1)
  })

  it("fulfills when the first completed input fulfills", async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const result = MyPromise.race([first.promise, second.promise])
    second.resolve("winner")
    await expect(result).resolves.toBe("winner")
    first.resolve("late")
    await expect(result).resolves.toBe("winner")
  })

  it("rejects when the first completed input rejects", async () => {
    const pending = deferred<number>()
    const failed = deferred<number>()
    const result = MyPromise.race([pending.promise, failed.promise])
    const check = expect(result).rejects.toBe("failure")
    failed.reject("failure")
    await check
    pending.resolve(1)
    await expect(result).rejects.toBe("failure")
  })

  it("accepts plain values", async () => {
    await expect(MyPromise.race([new MyPromise(() => {}), 5])).resolves.toBe(5)
  })

  it("uses iteration order for already fulfilled inputs", async () => {
    const first = new MyPromise((resolve) => resolve("first"))
    const second = new MyPromise((resolve) => resolve("second"))
    await expect(MyPromise.race([first, second])).resolves.toBe("first")
  })

  it("leaves empty input pending during the observation window", async () => {
    await expectPending(MyPromise.race([]))
  })
})
