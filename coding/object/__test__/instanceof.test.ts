import { describe, expect, it } from "vitest"
import { instanceOf } from "../instanceof.ts"

describe("instanceOf teaching version", () => {
  it("walks the prototype chain for objects and functions", () => {
    expect(instanceOf([], Array)).toBe(true)
    expect(instanceOf([], Object)).toBe(true)
    expect(instanceOf(() => {}, Function)).toBe(true)
    expect(instanceOf({}, Array)).toBe(false)
    expect(instanceOf(Object.create(null), Object)).toBe(false)
  })
  it("returns false for primitives and rejects invalid constructors", () => {
    expect(instanceOf(1, Number)).toBe(false)
    expect(instanceOf(null, Object)).toBe(false)
    expect(() => instanceOf({}, {})).toThrow(TypeError)
    expect(() => instanceOf({}, () => {})).toThrow(TypeError)
  })
})
