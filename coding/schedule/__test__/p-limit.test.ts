import { describe, expect, it, vi } from "vitest"
import { pLimit } from "../p-limit.ts"

const flush = () => new Promise<void>((resolve) => setImmediate(resolve))

describe("pLimit", () => {
  it("starts FIFO tasks as slots become available and keeps submission results independent", async () => {
    const limit = pLimit(2)
    const releases: Array<(value: number) => void> = []
    const started: number[] = []
    const results = [0, 1, 2, 3].map((index) =>
      limit((value: number) => {
        started.push(value)
        return new Promise<number>((resolve) => {
          releases[value] = resolve
        })
      }, index)
    )
    expect(limit.activeCount).toBe(2)
    expect(limit.pendingCount).toBe(2)
    await flush()
    expect(started).toEqual([0, 1])
    releases[1](10)
    await expect(results[1]).resolves.toBe(10)
    await flush()
    expect(started).toEqual([0, 1, 2])
    expect(limit.activeCount).toBe(2)
    expect(limit.pendingCount).toBe(1)
    releases[2](20)
    await flush()
    expect(started).toEqual([0, 1, 2, 3])
    releases[3](30)
    releases[0](0)
    await expect(Promise.all(results)).resolves.toEqual([0, 10, 20, 30])
    expect(limit.activeCount).toBe(0)
    expect(limit.pendingCount).toBe(0)
    await expect(limit(() => 4)).resolves.toBe(4)
  })

  it("releases slots for sync throws, rejected promises and thenable getter errors", async () => {
    const limit = pLimit(1)
    const error = new Error("failed")
    const checks = [
      expect(
        limit(() => {
          throw error
        })
      ).rejects.toBe(error),
      expect(limit(() => Promise.reject(error))).rejects.toBe(error),
      expect(
        limit(() => ({
          get then() {
            throw error
          },
        }))
      ).rejects.toBe(error),
      expect(limit(() => 7)).resolves.toBe(7),
    ]
    await Promise.all(checks)
    expect(limit.activeCount).toBe(0)
  })

  it("rejects cleared queued tasks, preserves running tasks and remains reusable", async () => {
    const limit = pLimit(1)
    let release!: () => void
    const running = limit(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        })
    )
    const task = vi.fn(() => 1)
    const error = new Error("discarded")
    const queued = limit(task)
    const rejected = expect(queued).rejects.toBe(error)
    limit.clearQueue(error)
    await rejected
    expect(limit.pendingCount).toBe(0)
    expect(limit.activeCount).toBe(1)
    expect(task).not.toHaveBeenCalled()
    await flush()
    release()
    await running
    await expect(limit(task)).resolves.toBe(1)
    limit.clearQueue()
    expect(limit.activeCount).toBe(0)
  })

  it.each([0, -1, 1.5, NaN, Infinity])("rejects concurrency %s", (value) => {
    expect(() => pLimit(value)).toThrow(RangeError)
  })
})
