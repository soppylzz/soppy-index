import { describe, expect, it, vi } from "vitest"
import { ObservableValue } from "../observer.ts"

describe("observable value", () => {
  it("suppresses identical writes and supplies old and new values", () => {
    const state = new ObservableValue(NaN)
    const observer = vi.fn()
    state.subscribe(observer)
    state.set(NaN)
    expect(observer).not.toHaveBeenCalled()
    state.set(0)
    state.set(-0)
    expect(observer).toHaveBeenCalledTimes(2)
    expect(observer).toHaveBeenLastCalledWith(-0, 0)
  })
  it("queues recursive notifications after all observers of the current change", () => {
    const state = new ObservableValue(0)
    const events: string[] = []
    state.subscribe((value) => {
      events.push(`A:${value}`)
      if (value === 1) state.set(2)
    })
    state.subscribe((value) => events.push(`B:${value}`))
    state.set(1)
    expect(events).toEqual(["A:1", "B:1", "A:2", "B:2"])
    expect(state.get()).toBe(2)
  })
  it("supports unsubscribe and skips removed observers during notification", () => {
    const state = new ObservableValue(0)
    const removed = vi.fn()
    state.subscribe(() => off())
    const off = state.subscribe(removed)
    state.set(1)
    expect(removed).not.toHaveBeenCalled()
  })
  it("propagates observer failures and can deliver subsequent writes", () => {
    const state = new ObservableValue(0)
    const off = state.subscribe(() => {
      throw new Error("failure")
    })
    expect(() => state.set(1)).toThrow("failure")
    expect(state.get()).toBe(1)
    off()
    const observer = vi.fn()
    state.subscribe(observer)
    state.set(2)
    expect(observer).toHaveBeenCalledExactlyOnceWith(2, 1)
  })
})
