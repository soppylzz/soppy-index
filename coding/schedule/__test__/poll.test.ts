import { afterEach, describe, expect, it, vi } from "vitest"
import { poll } from "../poll.ts"

afterEach(() => vi.useRealTimers())
describe("poll", () => {
  it("waits between completed attempts and stops immediately on success", async () => {
    vi.useFakeTimers()
    const task = vi.fn((attempt: number) => attempt)
    const result = poll(task, async (value) => value === 3, { interval: 100 })
    await vi.advanceTimersByTimeAsync(99)
    expect(task).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(task).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(100)
    await expect(result).resolves.toBe(3)
    expect(task.mock.calls).toEqual([[1], [2], [3]])
    expect(vi.getTimerCount()).toBe(0)
  })

  it("does not overlap pending tasks or asynchronous predicates", async () => {
    vi.useFakeTimers()
    let releaseTask!: (value: number) => void
    let releasePredicate!: (value: boolean) => void
    const task = vi.fn(
      () =>
        new Promise<number>((resolve) => {
          releaseTask = resolve
        })
    )
    const predicate = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          releasePredicate = resolve
        })
    )
    const result = poll(task, predicate, { interval: 10 })
    await vi.advanceTimersByTimeAsync(1000)
    expect(task).toHaveBeenCalledOnce()
    releaseTask(9)
    await vi.advanceTimersByTimeAsync(1000)
    expect(predicate).toHaveBeenCalledOnce()
    expect(task).toHaveBeenCalledOnce()
    releasePredicate(true)
    await expect(result).resolves.toBe(9)
  })

  it("rejects at the attempt cap without scheduling a final delay", async () => {
    vi.useFakeTimers()
    const task = vi.fn(() => false)
    const result = poll(task, Boolean, { maxAttempts: 2, interval: 10 })
    const rejected = expect(result).rejects.toThrow("maximum number")
    await vi.runAllTimersAsync()
    await rejected
    expect(task).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("propagates task and predicate failures without retrying", async () => {
    const error = new Error("failed")
    const task = vi.fn(() => {
      throw error
    })
    await expect(poll(task, () => false)).rejects.toBe(error)
    expect(task).toHaveBeenCalledOnce()
    await expect(
      poll(
        () => 1,
        () => Promise.reject(error)
      )
    ).rejects.toBe(error)
  })

  it("cancels the waiting interval and prevents further attempts", async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const reason = new Error("cancelled")
    const task = vi.fn(() => 0)
    const result = poll(task, () => false, { signal: controller.signal })
    const rejected = expect(result).rejects.toBe(reason)
    await vi.advanceTimersByTimeAsync(0)
    controller.abort(reason)
    await rejected
    expect(vi.getTimerCount()).toBe(0)
    expect(task).toHaveBeenCalledOnce()
    task.mockClear()
    await expect(poll(task, () => true, { signal: controller.signal })).rejects.toBe(reason)
    expect(task).not.toHaveBeenCalled()
  })

  it("checks cancellation after an in-flight task completes", async () => {
    const controller = new AbortController()
    let release!: (value: number) => void
    const predicate = vi.fn(() => true)
    const result = poll(
      () =>
        new Promise<number>((resolve) => {
          release = resolve
        }),
      predicate,
      { signal: controller.signal }
    )
    const reason = new Error("cancelled")
    controller.abort(reason)
    release(1)
    await expect(result).rejects.toBe(reason)
    expect(predicate).not.toHaveBeenCalled()
  })

  it.each([
    { maxAttempts: 0 },
    { maxAttempts: 1.5 },
    { interval: -1 },
    { interval: Infinity },
    { interval: 2_147_483_648 },
  ])("validates options %j before starting", async (options) => {
    const task = vi.fn(() => 1)
    await expect(poll(task, () => true, options)).rejects.toThrow(RangeError)
    expect(task).not.toHaveBeenCalled()
  })
})
