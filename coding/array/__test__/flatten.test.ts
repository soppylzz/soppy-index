/* eslint-disable no-sparse-arrays -- Sparse arrays are intentional behavioral fixtures. */
import { describe, expect, it } from "vitest"
import { flatten } from "../flatten.ts"

describe("flatten", () => {
  it("supports default, zero, finite and infinite depth without mutation", () => {
    const source = [1, [2, [3]]]
    expect(flatten(source)).toEqual([1, 2, [3]])
    expect(flatten(source, 0)).toEqual(source)
    expect(flatten(source, Infinity)).toEqual([1, 2, 3])
    expect(source).toEqual([1, [2, [3]]])
  })
  it("skips holes only at visited levels and truncates depth", () => {
    expect(flatten([, [1, , [2]]], 1.9)).toEqual([1, [2]])
    expect(flatten([1, [2]], -1)).toEqual([1, [2]])
    expect(flatten([1, [2]], NaN)).toEqual([1, [2]])
  })
})
