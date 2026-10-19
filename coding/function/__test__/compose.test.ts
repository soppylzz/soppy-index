import { describe, expect, it } from "vitest"
import { compose } from "../compose.ts"

describe("compose", () => {
  it("executes from right to left and provides identity for no functions", () => {
    expect(
      compose(
        (n: number) => n + 1,
        (n: number) => n * 2
      )(3)
    ).toBe(7)
    const value = {}
    expect(compose()(value)).toBe(value)
  })
  it("propagates exceptions without executing outer functions", () => {
    let ran = false
    expect(() =>
      compose(
        () => {
          ran = true
          return 1
        },
        () => {
          throw new Error("failure")
        }
      )(0)
    ).toThrow("failure")
    expect(ran).toBe(false)
  })
})
