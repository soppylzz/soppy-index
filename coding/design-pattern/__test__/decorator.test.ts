import { describe, expect, it, vi } from "vitest"
import { withRequestLog, type RequestLog } from "../decorator.ts"

describe("request decorator", () => {
  it("preserves arguments, receiver and the awaited return value", async () => {
    const entries: RequestLog[] = []
    const request = withRequestLog(
      function (this: { base: number }, value: number) {
        return this.base + value
      },
      (entry) => entries.push(entry)
    )
    await expect(request.call({ base: 10 }, 2)).resolves.toBe(12)
    expect(entries).toEqual([{ phase: "start" }, { phase: "success" }])
  })
  it("does not report success before the request finishes", async () => {
    let complete!: (value: number) => void
    const log = vi.fn()
    const request = withRequestLog(
      () =>
        new Promise<number>((resolve) => {
          complete = resolve
        }),
      log
    )
    const result = request()
    expect(log.mock.calls).toEqual([[{ phase: "start" }]])
    complete(1)
    await result
    expect(log).toHaveBeenLastCalledWith({ phase: "success" })
  })
  it("logs and propagates synchronous throws and asynchronous rejections", async () => {
    const error = new Error("failure")
    for (const request of [
      () => {
        throw error
      },
      () => Promise.reject(error),
    ]) {
      const log = vi.fn()
      await expect(withRequestLog(request, log)()).rejects.toBe(error)
      expect(log).toHaveBeenLastCalledWith({ phase: "error", error })
    }
  })
})
