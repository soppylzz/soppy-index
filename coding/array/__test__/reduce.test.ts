import { describe, expect, it } from "vitest"
import { reduce } from "../reduce.ts"

describe("reduce", () => {
  it("supports initial values of different types", () => {
    expect(reduce([1, 2, 3], (acc, value) => acc + value)).toBe(6)
    expect(reduce([1, 2], (acc, value) => acc + value, "")).toBe("12")
    expect(reduce<number, undefined>([], () => undefined, undefined)).toBeUndefined()
  })
  it("finds the first present value and rejects completely empty inputs", () => {
    const source = new Array<number>(4)
    source[2] = 3
    source[3] = 4
    expect(reduce(source, (acc, value) => acc + value)).toBe(7)
    expect(() => reduce([], (a: number, b: number) => a + b)).toThrow(TypeError)
    expect(() => reduce(new Array<number>(3), (a, b) => a + b)).toThrow(TypeError)
  })
  it("captures length and rejects invalid callbacks even on empty input", () => {
    const source = [1, 2]
    expect(
      reduce(
        source,
        (acc, value) => {
          source.push(9)
          return acc + value
        },
        0
      )
    ).toBe(3)
    expect(() => reduce([], null as never, 0)).toThrow(TypeError)
  })
})
