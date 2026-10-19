import { describe, expect, it } from "vitest"
import { parseQuery } from "../parse-query.ts"

describe("parseQuery", () => {
  it("decodes text, plus signs, repeated keys, empty values and embedded equals", () => {
    expect(parseQuery("?name=%E4%B8%AD%E6%96%87&name=a+b&empty&token=a=b#ignored")).toEqual({
      name: ["中文", "a b"],
      empty: "",
      token: "a=b",
    })
  })
  it("does not inherit dangerous query keys", () => {
    const result = parseQuery("__proto__=safe&constructor=plain")
    expect(Object.getPrototypeOf(result)).toBeNull()
    expect(result.__proto__).toBe("safe")
    expect(result.constructor).toBe("plain")
    expect(parseQuery("")).toEqual({})
  })
  it("rejects malformed percent escapes", () => {
    expect(() => parseQuery("a=%E0%A4")).toThrow(URIError)
  })
})
