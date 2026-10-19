import { describe, expect, it } from "vitest"
import { call } from "../call.ts"

describe("call teaching version", () => {
  it("sets the receiver and forwards arguments", () => {
    const context = { base: 10 }
    function add(this: typeof context, a: number, b: number) {
      return this.base + a + b
    }
    expect(call(add, context, 1, 2)).toBe(13)
    expect(Reflect.ownKeys(context)).toEqual(["base"])
  })
  it("cleans the temporary property when the target throws", () => {
    const context = {}
    expect(() =>
      call(() => {
        throw new Error("failure")
      }, context)
    ).toThrow("failure")
    expect(Reflect.ownKeys(context)).toEqual([])
  })
  it("documents receiver boxing and rejection of nonextensible receivers", () => {
    expect(
      call(function (this: unknown) {
        return Object.prototype.toString.call(this)
      }, 3)
    ).toBe("[object Number]")
    expect(() => call(() => {}, Object.freeze({}))).toThrow(TypeError)
  })
})
