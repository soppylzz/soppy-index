import { describe, expect, it, vi } from "vitest"
import { createSingleton } from "../singleton.ts"

describe("singleton", () => {
  it("initializes lazily once with the first successful arguments", () => {
    const factory = vi.fn((name: string) => ({ name }))
    const getService = createSingleton(factory)
    expect(factory).not.toHaveBeenCalled()
    const first = getService("first")
    expect(getService("second")).toBe(first)
    expect(first.name).toBe("first")
    expect(factory).toHaveBeenCalledTimes(1)
  })
  it("caches undefined and retries failed initialization", () => {
    const factory = vi.fn(() => undefined)
    const getValue = createSingleton(factory)
    getValue()
    getValue()
    expect(factory).toHaveBeenCalledTimes(1)
    let attempts = 0
    const getService = createSingleton(() => {
      if (++attempts === 1) throw new Error("failure")
      return {}
    })
    expect(getService).toThrow("failure")
    expect(getService()).toBe(getService())
  })
  it("rejects recursive initialization without leaving the singleton locked", () => {
    let recurse = true
    const getService: () => object = createSingleton(() => (recurse ? getService() : {}))
    expect(getService).toThrow("Recursive")
    recurse = false
    expect(getService()).toBe(getService())
  })
})
