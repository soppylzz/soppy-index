/* eslint-disable no-sparse-arrays -- Sparse arrays are intentional behavioral fixtures. */
import { describe, expect, it } from "vitest"
import { map } from "../map.ts"

describe("map", () => {
  it("preserves holes and passes receiver, index and source", () => {
    const source = [, 2, 3]
    const result = map(
      source,
      function (this: { n: number }, value, index, array) {
        expect(array).toBe(source)
        return value! + this.n + index
      },
      { n: 10 }
    )
    expect(result).toEqual([, 13, 15])
    expect(0 in result).toBe(false)
  })
  it("captures length but observes deletion of unvisited elements", () => {
    const source = [1, 2, 3]
    const result = map(source, (value, index) => {
      if (index === 0) {
        source.push(4)
        delete source[1]
      }
      return value * 2
    })
    expect(result).toEqual([2, , 6])
    expect(() => map([], null as never)).toThrow(TypeError)
  })
})
