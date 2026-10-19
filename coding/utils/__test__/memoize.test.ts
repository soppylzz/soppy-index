import { describe, expect, it, vi } from "vitest"
import { memoize } from "../memoize.ts"

describe("memoize", () => {
  it("uses every argument and caches undefined", () => {
    const fn = vi.fn((..._args: unknown[]) => undefined)
    const wrapped = memoize(fn)
    wrapped(1, 2)
    wrapped(1, 2)
    wrapped(1)
    wrapped(1, undefined)
    expect(fn).toHaveBeenCalledTimes(3)
    wrapped.clear()
    wrapped(1, 2)
    expect(fn).toHaveBeenCalledTimes(4)
  })
  it("distinguishes object identities and receivers", () => {
    const fn = vi.fn(function (this: { n: number }, value: object) {
      return [this.n, value]
    })
    const wrapped = memoize(fn)
    const first = { n: 1 }
    const second = { n: 2 }
    const argument = {}
    expect(wrapped.call(first, argument)).toBe(wrapped.call(first, argument))
    wrapped.call(first, {})
    wrapped.call(second, argument)
    expect(fn).toHaveBeenCalledTimes(3)
  })
  it("supports a resolver and retries after a synchronous exception", () => {
    const fn = vi.fn((value: { id: number }) => value.id)
    const wrapped = memoize(fn, (value) => value.id)
    wrapped({ id: 1 })
    wrapped({ id: 1 })
    expect(fn).toHaveBeenCalledTimes(1)
    let attempts = 0
    const unstable = memoize(() => {
      if (++attempts === 1) throw new Error("failure")
      return 2
    })
    expect(unstable).toThrow("failure")
    expect(unstable()).toBe(2)
  })
})
