/* eslint-disable no-sparse-arrays -- Sparse arrays are intentional behavioral fixtures. */
import { describe, expect, it } from "vitest"
import { unique } from "../unique.ts"

describe("unique", () => {
  it("preserves first occurrence and handles NaN and signed zero", () => {
    const result = unique([3, 1, 3, NaN, NaN, -0, 0])
    expect(result).toEqual([3, 1, NaN, -0])
  })
  it("compares objects by identity and treats holes as undefined", () => {
    const value = {}
    expect(unique([value, value, {}])).toHaveLength(2)
    expect(unique([, undefined])).toEqual([undefined])
  })
})
