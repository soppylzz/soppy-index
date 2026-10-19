import { describe, expect, it, vi } from "vitest"
import { runSeries } from "../run-series.ts"

describe("runSeries", () => {
  it("waits before starting the next task and preserves result order", async () => {
    let release!: (value: number) => void
    const second = vi.fn(() => 2)
    const result = runSeries([
      () =>
        new Promise<number>((resolve) => {
          release = resolve
        }),
      second,
    ])
    expect(second).not.toHaveBeenCalled()
    release(1)
    await expect(result).resolves.toEqual([1, 2])
    expect(second).toHaveBeenCalledOnce()
  })

  it.each([false, true])(
    "stops on failure (async: %s) and closes the iterator",
    async (asyncFailure) => {
      const error = new Error("failed")
      const closed = vi.fn()
      const next = vi.fn(() => 2)
      function* tasks() {
        try {
          yield () => {
            if (asyncFailure) return Promise.reject(error)
            throw error
          }
          yield next
        } finally {
          closed()
        }
      }
      await expect(runSeries(tasks())).rejects.toBe(error)
      expect(next).not.toHaveBeenCalled()
      expect(closed).toHaveBeenCalledOnce()
    }
  )

  it("handles empty iterables and iterator failures", async () => {
    await expect(runSeries([])).resolves.toEqual([])
    const error = new Error("iterator failed")
    function* tasks() {
      yield () => 1
      throw error
    }
    await expect(runSeries(tasks())).rejects.toBe(error)
  })
})
