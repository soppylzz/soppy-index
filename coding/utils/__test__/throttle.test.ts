import { afterEach, describe, expect, it, vi } from "vitest"
import { throttle } from "../throttle.ts"

afterEach(() => vi.useRealTimers())
describe("throttle", () => {
  it("invokes leading and trailing calls with the latest arguments", () => {
    vi.useFakeTimers()
    const fn = vi.fn((value: number) => value)
    const wrapped = throttle(fn, 100)
    expect(wrapped(1)).toBe(1)
    vi.advanceTimersByTime(50)
    wrapped(2)
    wrapped(3)
    expect(fn.mock.calls).toEqual([[1]])
    vi.advanceTimersByTime(50)
    expect(fn.mock.calls).toEqual([[1], [3]])
    wrapped(4)
    vi.advanceTimersByTime(100)
    expect(fn.mock.calls).toEqual([[1], [3], [4]])
    wrapped.cancel()
    expect(vi.getTimerCount()).toBe(0)
  })
  it("supports trailing-only calls and preserves this", () => {
    vi.useFakeTimers()
    const calls: number[] = []
    const wrapped = throttle(
      function (this: { base: number }, value: number) {
        calls.push(this.base + value)
      },
      20,
      { leading: false }
    )
    wrapped.call({ base: 10 }, 2)
    expect(calls).toEqual([])
    vi.advanceTimersByTime(20)
    expect(calls).toEqual([12])
    wrapped.cancel()
  })
  it("supports leading-only calls, cancellation and disabled edges", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const wrapped = throttle(fn, 10, { trailing: false })
    wrapped()
    wrapped()
    vi.advanceTimersByTime(10)
    wrapped()
    expect(fn).toHaveBeenCalledTimes(2)
    wrapped.cancel()
    const disabled = throttle(fn, 10, { leading: false, trailing: false })
    disabled()
    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(2)
  })
  it("does not invoke a canceled trailing call", () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const wrapped = throttle(fn, 10, { leading: false })
    wrapped()
    wrapped.cancel()
    vi.advanceTimersByTime(10)
    expect(fn).not.toHaveBeenCalled()
    expect(() => throttle(fn, Infinity)).toThrow(RangeError)
  })
})
