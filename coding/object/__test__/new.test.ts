import { describe, expect, it } from "vitest"
import { newObject } from "../new.ts"

describe("newObject teaching version", () => {
  it("links the prototype and initializes fields", () => {
    function Person(this: { name: string }, name: string) {
      this.name = name
    }
    const Constructor = Person as unknown as new (name: string) => { name: string }
    const value = newObject(Constructor, "Ada")
    expect(value.name).toBe("Ada")
    expect(Object.getPrototypeOf(value)).toBe(Person.prototype)
  })
  it("uses explicit object/function returns and ignores primitive returns", () => {
    const object = { n: 1 }
    const make = function () {
      return object
    } as unknown as new () => typeof object
    expect(newObject(make)).toBe(object)
    const target = () => 1
    const returnsFunction = function () {
      return target
    } as unknown as new () => typeof target
    expect(newObject(returnsFunction)).toBe(target)
    const primitive = function () {
      return 3
    } as unknown as new () => object
    expect(Object.getPrototypeOf(newObject(primitive))).toBe(primitive.prototype)
  })
  it("rejects arrows and classes in this simplified model", () => {
    expect(() => newObject((() => ({})) as unknown as new () => object)).toThrow(TypeError)
    expect(() => newObject(class Example {})).toThrow(TypeError)
  })
})
