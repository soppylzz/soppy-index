import { describe, expect, it } from "vitest"
import { adaptLegacyUser, adaptModernUser } from "../adapter.ts"

describe("user adapters", () => {
  it("normalizes legacy field names, identifiers and status flags", () => {
    const legacy = { user_id: 7, full_name: "Ada", enabled: 1 as const }
    expect(adaptLegacyUser(legacy)).toEqual({ id: "7", name: "Ada", disabled: false })
    expect(legacy).toEqual({ user_id: 7, full_name: "Ada", enabled: 1 })
  })
  it("gives different source contracts the same view model", () => {
    expect(adaptModernUser({ id: "7", displayName: "Ada", active: false })).toEqual(
      adaptLegacyUser({ user_id: 7, full_name: "Ada", enabled: 0 })
    )
  })
})
