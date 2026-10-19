import { describe, expect, it } from "vitest"
import { mapLimit } from "../map-limit.ts"

describe("mapLimit", () => {
  it("limits active tasks and returns results in input order", async () => {
    let active = 0
    let maximum = 0
    const releases: Array<() => void> = []
    const started: number[] = []
    const result = mapLimit([0, 1, 2, 3], 2, async (value) => {
      started.push(value)
      active += 1
      maximum = Math.max(maximum, active)
      await new Promise<void>((resolve) => {
        releases[value] = resolve
      })
      active -= 1
      return value * 2
    })
    expect(started).toEqual([0, 1])
    releases[1]()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(started).toEqual([0, 1, 2])
    releases[2]()
    await new Promise<void>((resolve) => setImmediate(resolve))
    releases[3]()
    releases[0]()
    await expect(result).resolves.toEqual([0, 2, 4, 6])
    expect(maximum).toBe(2)
  })
  it("stops starting queued work after failure while observing running tasks", async () => {
    const started: number[] = []
    let release!: () => void
    const result = mapLimit([0, 1, 2], 2, async (value) => {
      started.push(value)
      if (value === 0) {
        await new Promise<void>((resolve) => {
          release = resolve
        })
        return 0
      }
      throw new Error("failure")
    })
    await expect(result).rejects.toThrow("failure")
    release()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(started).toEqual([0, 1])
  })
  it("accepts iterable values, sync results, empty input and validates the limit", async () => {
    await expect(mapLimit(new Set([1, 2]), 3, (value) => value * 2)).resolves.toEqual([2, 4])
    await expect(mapLimit([], 1, () => 1)).resolves.toEqual([])
    await expect(mapLimit([], 0, () => 1)).rejects.toThrow(RangeError)
    await expect(
      mapLimit([1], 1, () => {
        throw new Error("sync failure")
      })
    ).rejects.toThrow("sync failure")
  })
})
