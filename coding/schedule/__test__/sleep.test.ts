import { afterEach, describe, expect, it, vi } from "vitest"
import { sleep } from "../sleep.ts"

afterEach(() => vi.useRealTimers())
describe("sleep", () => {
  it("waits until its deadline, including an asynchronous zero delay", async () => {
    vi.useFakeTimers()
    const done = vi.fn()
    const result = sleep(100).then(done)
    await vi.advanceTimersByTimeAsync(99)
    expect(done).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await result
    expect(done).toHaveBeenCalledOnce()
    const zero = vi.fn()
    const next = sleep(0).then(zero)
    await Promise.resolve()
    expect(zero).not.toHaveBeenCalled()
    await vi.runAllTimersAsync()
    await next
    expect(zero).toHaveBeenCalledOnce()
  })

  it("rejects pre-aborted and pending waits with the original reason and removes timers", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const reason = new Error("cancelled")
    const result = sleep(100, controller.signal)
    const rejected = expect(result).rejects.toBe(reason)
    controller.abort(reason)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
    await expect(sleep(100, controller.signal)).rejects.toBe(reason)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("removes its abort listener after successful completion", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const remove = vi.spyOn(controller.signal, "removeEventListener")
    const result = sleep(1, controller.signal)
    await vi.runAllTimersAsync()
    await result
    expect(remove).toHaveBeenCalledWith("abort", expect.any(Function))
    controller.abort()
  })

  it.each([-1, NaN, Infinity, 2_147_483_648])("rejects delay %s", async (value) => {
    await expect(sleep(value)).rejects.toThrow(RangeError)
  })
})
