import { describe, expect, it, vi } from "vitest"
import { createFormFacade } from "../facade.ts"

describe("form facade", () => {
  it("returns validation errors without submitting", async () => {
    const submit = vi.fn()
    const form = createFormFacade({ validate: (_: string) => ["Required"], submit })
    await expect(form.submit("")).resolves.toEqual({ status: "invalid", errors: ["Required"] })
    expect(submit).not.toHaveBeenCalled()
    expect(form.busy).toBe(false)
  })
  it("coordinates busy state, submission and duplicate prevention", async () => {
    let complete!: (value: string) => void
    const form = createFormFacade({
      validate: (_: string) => [],
      submit: () =>
        new Promise<string>((resolve) => {
          complete = resolve
        }),
    })
    const first = form.submit("Ada")
    expect(form.busy).toBe(true)
    await expect(form.submit("Grace")).rejects.toThrow("already in progress")
    complete("Saved")
    await expect(first).resolves.toEqual({ status: "submitted", value: "Saved" })
    expect(form.busy).toBe(false)
  })
  it("releases busy state on rejection and supports another attempt", async () => {
    const submit = vi.fn().mockRejectedValueOnce("failure").mockResolvedValueOnce("Saved")
    const form = createFormFacade({ validate: (_: string) => [], submit })
    await expect(form.submit("Ada")).rejects.toBe("failure")
    expect(form.busy).toBe(false)
    await expect(form.submit("Ada")).resolves.toEqual({ status: "submitted", value: "Saved" })
  })
  it("propagates validation exceptions before starting submission", async () => {
    const form = createFormFacade({
      validate() {
        throw new Error("validation failed")
      },
      submit: () => "unreachable",
    })
    await expect(form.submit(undefined)).rejects.toThrow("validation failed")
    expect(form.busy).toBe(false)
  })
})
