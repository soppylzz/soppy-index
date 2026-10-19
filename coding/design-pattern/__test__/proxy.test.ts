import { describe, expect, it } from "vitest"
import { createValidatedModel } from "../proxy.ts"

describe("validated proxy", () => {
  it("checks property writes before changing the model", () => {
    const original = { age: 20, name: "Ada" }
    const model = createValidatedModel(original, {
      age: (value) => typeof value === "number" && value >= 0,
    })
    model.age = 21
    expect(original.age).toBe(21)
    expect(() => {
      model.age = -1
    }).toThrow("Invalid value")
    expect(original.age).toBe(21)
    model.name = "Grace"
    expect(original.name).toBe("Grace")
  })
  it("preserves setters and rejects failed writes instead of pretending success", () => {
    const target = {
      stored: 1,
      get doubled() {
        return this.stored * 2
      },
      set doubled(value: number) {
        this.stored = value / 2
      },
    }
    const model = createValidatedModel(target, {})
    model.doubled = 8
    expect(model.stored).toBe(4)
    const frozen = createValidatedModel(Object.freeze({ value: 1 }), {})
    expect(() => {
      ;(frozen as { value: number }).value = 2
    }).toThrow(TypeError)
  })
  it("only guards writes through this shallow proxy", () => {
    const target = { age: 20, nested: { value: 1 } }
    const model = createValidatedModel(target, { age: () => false })
    target.age = -1
    expect(model.age).toBe(-1)
    model.nested.value = 2
    expect(target.nested.value).toBe(2)
  })
})
