import { describe, expect, it } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe("07 all", () => {
  it("returns a subject instance and accepts mixed inputs", async () => {
    const result = MyPromise.all([1, new MyPromise((resolve) => resolve(2)), Promise.resolve(3)])
    expect(result).toBeInstanceOf(MyPromise)
    await expect(result).resolves.toEqual([1, 2, 3])
  })

  it("preserves input order despite reverse completion order", async () => {
    const first = deferred<string>()
    const second = deferred<string>()
    const result = MyPromise.all([first.promise, second.promise])
    second.resolve("second")
    await expectPending(result)
    first.resolve("first")
    await expect(result).resolves.toEqual(["first", "second"])
  })

  it("rejects without waiting for other pending inputs", async () => {
    const pending = deferred<number>()
    const failed = deferred<number>()
    const result = MyPromise.all([pending.promise, failed.promise])
    const check = expect(result).rejects.toBe("failure")
    failed.reject("failure")
    await check
  })

  it("fulfills with an empty array for empty input", async () => {
    await expect(MyPromise.all([])).resolves.toEqual([])
  })

  it("assimilates external thenables", async () => {
    const thenable = {
      then(resolve: (value: number) => void) {
        resolve(4)
      },
    }
    await expect(MyPromise.all([thenable])).resolves.toEqual([4])
  })

  it("treats sparse array slots as undefined values", async () => {
    await expect(MyPromise.all(new Array(2))).resolves.toEqual([undefined, undefined])
  })
})
