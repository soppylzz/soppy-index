import { describe, expect, it } from "vitest"
import { curry, type Curried } from "../curry.ts"

describe("curry", () => {
  it("collects arguments in arbitrary groups and supports reusable branches", () => {
    const curried = curry((a: number, b: number, c: number) => a + b + c)
    const branch = curried(1) as Curried<number>
    expect((branch(2) as Curried<number>)(3)).toBe(6)
    expect(branch(3, 4)).toBe(8)
    expect(curried(1, 2, 3)).toBe(6)
  })
  it("uses final-call this and accepts explicit arity", () => {
    const curried = curry(function (this: { n: number }, ...values: number[]) {
      return this.n + values.reduce((a, b) => a + b, 0)
    }, 2)
    const branch = curried(1) as Curried<number>
    expect(branch.call({ n: 10 }, 2)).toBe(13)
    expect(curry(() => 4)()).toBe(4)
    expect(() => curry(() => 1, -1)).toThrow(RangeError)
  })
})
