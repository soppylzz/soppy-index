import { describe, expect, it, vi } from "vitest"
import { once } from "../once.ts"

describe("once", () => {
  it("uses the first successful call and preserves receiver and result", () => {
    const fn = vi.fn(function (this: { base: number }, value: number) {
      return { result: this.base + value }
    })
    const wrapped = once(fn)
    const first = wrapped.call({ base: 1 }, 2)
    expect(first).toEqual({ result: 3 })
    expect(wrapped.call({ base: 10 }, 20)).toBe(first)
    expect(fn).toHaveBeenCalledTimes(1)
  })
  it("caches undefined but retries synchronous failures", () => {
    const fn = vi.fn()
    const wrapped = once(fn)
    wrapped()
    wrapped()
    expect(fn).toHaveBeenCalledTimes(1)
    let count = 0
    const unstable = once(() => {
      if (++count === 1) throw new Error("failure")
      return count
    })
    expect(unstable).toThrow("failure")
    expect(unstable()).toBe(2)
    expect(unstable()).toBe(2)
  })
})
