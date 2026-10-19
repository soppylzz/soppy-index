import { describe, expect, it, vi } from "vitest"
import { MyPromise, deferred, expectPending } from "./helpers.ts"

describe("05 catch", () => {
  it("recovers from rejection", async () => {
    await expect(new MyPromise((_, reject) => reject("failure")).catch(() => 31)).resolves.toBe(31)
  })

  it("passes through success without calling the handler", async () => {
    const handler = vi.fn()
    await expect(new MyPromise((resolve) => resolve(32)).catch(handler)).resolves.toBe(32)
    expect(handler).not.toHaveBeenCalled()
  })

  it("adopts a recovery promise", async () => {
    const recovery = deferred<number>()
    const result = new MyPromise((_, reject) => reject("failure")).catch(() => recovery.promise)
    recovery.resolve(33)
    await expect(result).resolves.toBe(33)
  })

  it("propagates a thrown replacement error", async () => {
    const error = new Error("recovery failed")
    await expect(
      new MyPromise((_, reject) => reject("failure")).catch(() => {
        throw error
      })
    ).rejects.toBe(error)
  })
})

describe.each(["fulfilled", "rejected"])("05 finally on %s", (state) => {
  const create = () =>
    new MyPromise((resolve, reject) => {
      if (state === "fulfilled") resolve("original")
      else reject("original")
    })
  const checkOriginal = async (result: Promise<unknown>) => {
    if (state === "fulfilled") await expect(result).resolves.toBe("original")
    else await expect(result).rejects.toBe("original")
  }

  it("runs once without arguments and preserves the original outcome", async () => {
    const cleanup = vi.fn(() => "ignored")
    await checkOriginal(create().finally(cleanup))
    expect(cleanup).toHaveBeenCalledExactlyOnceWith()
  })

  it("waits for successful asynchronous cleanup", async () => {
    const cleanup = deferred<number>()
    const result = create().finally(() => cleanup.promise)
    await expectPending(result)
    const check = checkOriginal(result)
    cleanup.resolve(34)
    await check
  })

  it("replaces the original outcome if cleanup throws", async () => {
    const error = new Error("cleanup failed")
    await expect(
      create().finally(() => {
        throw error
      })
    ).rejects.toBe(error)
  })

  it("replaces the original outcome if asynchronous cleanup rejects", async () => {
    const cleanup = deferred<number>()
    const result = create().finally(() => cleanup.promise)
    const check = expect(result).rejects.toBe("cleanup failure")
    cleanup.reject("cleanup failure")
    await check
  })

  it("ignores a non-function cleanup argument", async () => {
    await checkOriginal(create().finally(42 as never))
  })
})
