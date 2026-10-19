import { describe, expect, it } from "vitest"
import { template } from "../template.ts"

describe("template", () => {
  it("reads nested own values without losing zero or false", () => {
    expect(
      template(
        "{{ user.name }}:{{n}}:{{flag}}:{{missing}}",
        { user: { name: "Ada" }, n: 0, flag: false },
        "?"
      )
    ).toBe("Ada:0:false:?")
  })
  it("does not read inherited properties or evaluate expressions", () => {
    expect(template("{{toString}} {{a + b}} {{value}}", { value: null })).toBe(" {{a + b}} ")
  })
})
