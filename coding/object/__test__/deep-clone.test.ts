/* eslint-disable no-sparse-arrays -- Sparse arrays are intentional behavioral fixtures. */
import { describe, expect, it } from "vitest"
import { deepClone } from "../deep-clone.ts"

describe("deepClone", () => {
  it("preserves cycles and shared references without sharing source objects", () => {
    const shared = { n: 1 }
    const source: { first: typeof shared; second: typeof shared; self?: unknown } = {
      first: shared,
      second: shared,
    }
    source.self = source
    const clone = deepClone(source)
    expect(clone).not.toBe(source)
    expect(clone.self).toBe(clone)
    expect(clone.first).toBe(clone.second)
    expect(clone.first).not.toBe(shared)
  })
  it("clones Map keys, Set entries, Date and RegExp while preserving aliases", () => {
    const key = { n: 1 }
    const regexp = /a/gi
    regexp.lastIndex = 2
    const source = {
      key,
      map: new Map([[key, key]]),
      set: new Set([key]),
      date: new Date(123),
      regexp,
    }
    const clone = deepClone(source)
    expect(clone.map.get(clone.key)).toBe(clone.key)
    expect(clone.set.has(clone.key)).toBe(true)
    expect(clone.date.getTime()).toBe(123)
    expect(clone.date).not.toBe(source.date)
    expect(clone.regexp.source).toBe("a")
    expect(clone.regexp.flags).toBe("gi")
    expect(clone.regexp.lastIndex).toBe(2)
  })
  it("preserves symbols, descriptors, accessors and sparse arrays", () => {
    const symbol = Symbol("key")
    let reads = 0
    const source = {
      [symbol]: { n: 1 },
      get computed() {
        reads += 1
        return 1
      },
    }
    Object.defineProperty(source, "hidden", { value: { n: 2 }, enumerable: false })
    const clone = deepClone(source)
    expect(reads).toBe(0)
    expect(clone[symbol]).not.toBe(source[symbol])
    expect(Object.getOwnPropertyDescriptor(clone, "hidden")?.enumerable).toBe(false)
    expect(Object.getOwnPropertyDescriptor(clone, "computed")?.get).toBe(
      Object.getOwnPropertyDescriptor(source, "computed")?.get
    )
    const array = deepClone([, { n: 1 }])
    expect(0 in array).toBe(false)
    expect(array.length).toBe(2)
  })
  it("preserves null prototypes and function identities and rejects unsupported types", () => {
    const fn = () => 1
    expect(deepClone(fn)).toBe(fn)
    expect(Object.getPrototypeOf(deepClone(Object.create(null)))).toBeNull()
    expect(() => deepClone(new WeakMap())).toThrow(TypeError)
    expect(() => deepClone(new Uint8Array(1))).toThrow(TypeError)
    expect(() => deepClone(new (class Example {})())).toThrow(TypeError)
  })
})
