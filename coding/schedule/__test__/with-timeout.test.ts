import { afterEach, describe, expect, it, vi } from "vitest"
import { TimeoutError, withTimeout } from "../with-timeout.ts"

afterEach(() => vi.useRealTimers())
describe("withTimeout", () => {
  it("returns synchronous and asynchronous results and clears deadline timers", async () => {
    vi.useFakeTimers()
    await expect(withTimeout(() => 3, 0)).resolves.toBe(3)
    await expect(withTimeout(() => Promise.resolve(4), 100)).resolves.toBe(4)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("preserves task failures and clears the timer", async () => {
    vi.useFakeTimers()
    const error = new Error("failed")
    await expect(
      withTimeout(() => {
        throw error
      }, 100)
    ).rejects.toBe(error)
    await expect(withTimeout(() => Promise.reject(error), 100)).rejects.toBe(error)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("rejects at the deadline and notifies cooperative cancellation", async () => {
    vi.useFakeTimers()
    let signal!: AbortSignal
    const result = withTimeout((received) => {
      signal = received
      return new Promise<never>((_, reject) => {
        signal.addEventListener("abort", () => reject(signal.reason), { once: true })
      })
    }, 100)
    const rejected = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(99)
    expect(signal.aborted).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await rejected
    expect(signal.aborted).toBe(true)
    expect(signal.reason).toBeInstanceOf(TimeoutError)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("observes late rejection even when the underlying operation ignores cancellation", async () => {
    vi.useFakeTimers()
    let rejectTask!: (reason: unknown) => void
    const result = withTimeout(
      () =>
        new Promise<never>((_, reject) => {
          rejectTask = reject
        }),
      1
    )
    const rejected = expect(result).rejects.toBeInstanceOf(TimeoutError)
    await vi.advanceTimersByTimeAsync(1)
    await rejected
    rejectTask(new Error("late failure"))
    await Promise.resolve()
  })

  it.each([-1, Infinity, NaN, 2_147_483_648])(
    "rejects timeout %s without starting work",
    async (value) => {
      const task = vi.fn(() => 1)
      await expect(withTimeout(task, value)).rejects.toThrow(RangeError)
      expect(task).not.toHaveBeenCalled()
    }
  )
})
