import { describe, expect, it } from "vitest"
import { createNotification } from "../factory.ts"

describe("notification factory", () => {
  it("selects creation defaults while preserving the common shape", () => {
    expect(createNotification("success", "Saved")).toEqual({
      kind: "success",
      message: "Saved",
      role: "status",
      duration: 3000,
    })
    expect(createNotification("error", "Failed")).toMatchObject({ role: "alert", duration: 0 })
    expect(createNotification("warning", "Check input").duration).toBe(5000)
  })
  it("returns fresh products and rejects unsupported kinds", () => {
    const first = createNotification("success", "Saved")
    first.duration = 1
    expect(createNotification("success", "Saved").duration).toBe(3000)
    expect(() => createNotification("toString" as never, "Bad")).toThrow(RangeError)
  })
})
