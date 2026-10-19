import { afterEach, describe, expect, it, vi } from "vitest"
import { retry } from "../retry.ts"

afterEach(() => vi.useRealTimers())
describe("retry", () => {
  it("retries rejected results and supplies one-based attempt numbers", async () => {
    const attempts: number[] = []
    await expect(
      retry(
        async (attempt) => {
          attempts.push(attempt)
          if (attempt < 3) throw new Error("temporary")
          return 7
        },
        { retries: 2 }
      )
    ).resolves.toBe(7)
    expect(attempts).toEqual([1, 2, 3])
  })
  it("propagates the final error and supports non-retryable failures", async () => {
    const error = new Error("failure")
    const task = vi.fn(() => {
      throw error
    })
    await expect(retry(task, { retries: 2 })).rejects.toBe(error)
    expect(task).toHaveBeenCalledTimes(3)
    task.mockClear()
    await expect(retry(task, { shouldRetry: () => false })).rejects.toBe(error)
    expect(task).toHaveBeenCalledTimes(1)
  })
  it("waits the specified interval before retrying", async () => {
    vi.useFakeTimers()
    const task = vi.fn().mockRejectedValueOnce("temporary").mockResolvedValueOnce(9)
    const result = retry(task, { retries: 1, delay: 100 })
    await vi.advanceTimersByTimeAsync(99)
    expect(task).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(result).resolves.toBe(9)
  })
  it("supports zero retries and rejects invalid options", async () => {
    const task = vi.fn(() => {
      throw "failure"
    })
    await expect(retry(task, { retries: 0 })).rejects.toBe("failure")
    expect(task).toHaveBeenCalledTimes(1)
    await expect(retry(() => 1, { retries: -1 })).rejects.toThrow(RangeError)
    await expect(retry(() => 1, { delay: Infinity })).rejects.toThrow(RangeError)
  })
})
