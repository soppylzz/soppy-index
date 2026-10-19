/* eslint-disable no-sparse-arrays -- Sparse arrays are intentional behavioral fixtures. */
import { describe, expect, it } from "vitest"
import { filter } from "../filter.ts"

describe("filter", () => {
  it("skips holes and returns a dense array", () => {
    expect(filter([, 0, 1, 2], (value) => value)).toEqual([1, 2])
  })
  it("captures values before the callback mutates the source", () => {
    const source = [1, 2]
    const result = filter(
      source,
      function (this: { min: number }, value, index, array) {
        expect(array).toBe(source)
        source[index] = 9
        if (index === 0) source.push(3)
        return value >= this.min
      },
      { min: 2 }
    )
    expect(result).toEqual([2])
    expect(() => filter([], null as never)).toThrow(TypeError)
  })
})
