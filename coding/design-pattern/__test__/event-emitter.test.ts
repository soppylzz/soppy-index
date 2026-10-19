import { describe, expect, it, vi } from "vitest"
import { EventEmitter } from "../event-emitter.ts"

describe("EventEmitter", () => {
  it("subscribes, emits in order and returns unsubscribe functions", () => {
    const events = new EventEmitter<{ value: [number] }>()
    const values: number[] = []
    const off = events.on("value", (value) => values.push(value))
    events.on("value", (value) => values.push(value * 2))
    expect(events.emit("value", 2)).toBe(true)
    off()
    events.emit("value", 3)
    expect(values).toEqual([2, 4, 6])
  })
  it("removes once listeners before calling them to handle recursive emits", () => {
    const events = new EventEmitter<{ tick: [] }>()
    const once = vi.fn(() => {
      events.emit("tick")
    })
    events.once("tick", once)
    events.emit("tick")
    expect(once).toHaveBeenCalledTimes(1)
    expect(events.emit("tick")).toBe(false)
  })
  it("defers newly added listeners and skips listeners removed during emission", () => {
    const events = new EventEmitter<{ tick: [] }>()
    const late = vi.fn()
    const removed = vi.fn()
    events.once("tick", () => {
      events.on("tick", late)
      events.off("tick", removed)
    })
    events.on("tick", removed)
    events.emit("tick")
    expect(removed).not.toHaveBeenCalled()
    expect(late).not.toHaveBeenCalled()
    events.emit("tick")
    expect(late).toHaveBeenCalledTimes(1)
  })
  it("supports duplicate subscriptions, targeted off, clear and thrown listener errors", () => {
    const events = new EventEmitter<{ a: []; b: [] }>()
    const listener = vi.fn()
    events.on("a", listener)
    events.on("a", listener)
    events.emit("a")
    expect(listener).toHaveBeenCalledTimes(2)
    events.off("a", listener)
    expect(events.emit("a")).toBe(false)
    events.on("a", listener)
    events.on("b", listener)
    events.clear("a")
    expect(events.emit("a")).toBe(false)
    events.clear()
    expect(events.emit("b")).toBe(false)
    events.on("a", () => {
      throw new Error("failure")
    })
    expect(() => events.emit("a")).toThrow("failure")
  })
})
