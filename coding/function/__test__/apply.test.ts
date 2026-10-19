import { describe, expect, it } from "vitest"
import { apply } from "../apply.ts"

describe("apply", () => {
  it("forwards tuple arguments and preserves the receiver", () => {
    expect(
      apply(
        function (this: { n: number }, a: number, b: number) {
          return this.n + a + b
        },
        { n: 1 },
        [2, 3]
      )
    ).toBe(6)
  })
  it("treats null or missing arguments as an empty list", () => {
    expect(apply(() => 1, undefined, null)).toBe(1)
    expect(apply(() => 2, undefined)).toBe(2)
  })
})
