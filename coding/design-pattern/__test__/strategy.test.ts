import { describe, expect, it } from "vitest"
import { FieldValidator, required, minLength } from "../strategy.ts"

describe("validation strategy", () => {
  it("switches algorithms without changing the validation caller", () => {
    const field = new FieldValidator(required)
    expect(field.validate("  ")).toBe("Required")
    expect(field.validate("a")).toBeUndefined()
    field.setStrategy(minLength(3))
    expect(field.validate("a")).toBe("Minimum length is 3")
    expect(field.validate("Ada")).toBeUndefined()
  })
  it("accepts an injected rule and validates strategy parameters", () => {
    const field = new FieldValidator((value) => (value === "admin" ? "Reserved" : undefined))
    expect(field.validate("admin")).toBe("Reserved")
    expect(() => minLength(-1)).toThrow(RangeError)
    expect(minLength(0)("")).toBeUndefined()
  })
})
