import { describe, expect, it } from "vitest"
import { bind } from "../bind.ts"

describe("bind", () => {
  it("fixes this and prepends arguments", () => {
    function sum(this: { n: number }, a: number, b: number) {
      return this.n + a + b
    }
    const bound = bind(sum, { n: 10 }, 1)
    expect(bound.call({ n: 100 }, 2)).toBe(13)
  })
  it("ignores the bound receiver during construction", () => {
    function Person(this: { name: string }, name: string) {
      this.name = name
    }
    const receiver = { name: "unchanged" }
    const Bound = bind(Person, receiver, "Ada") as unknown as new () => { name: string }
    const person = new Bound()
    expect(person.name).toBe("Ada")
    expect(receiver.name).toBe("unchanged")
    expect(person).toBeInstanceOf(Person)
    expect(person).toBeInstanceOf(Bound)
  })
  it("preserves explicit constructor return objects and rejects constructing arrows", () => {
    const Bound = bind(function () {
      return { n: 2 }
    }, null) as unknown as new () => { n: number }
    expect(new Bound()).toEqual({ n: 2 })
    const Arrow = bind(() => 1, null) as unknown as new () => object
    expect(() => new Arrow()).toThrow(TypeError)
  })
})
