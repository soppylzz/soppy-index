import { describe, expect, it } from "vitest"
import { UploadController } from "../state.ts"

describe("upload state machine", () => {
  it("follows permitted start, pause, resume, success and reset transitions", () => {
    const upload = new UploadController()
    expect(upload.dispatch("start")).toBe("uploading")
    expect(upload.dispatch("pause")).toBe("paused")
    expect(upload.dispatch("resume")).toBe("uploading")
    expect(upload.dispatch("succeed")).toBe("success")
    expect(upload.dispatch("reset")).toBe("idle")
  })
  it("rejects invalid transitions without changing state", () => {
    const upload = new UploadController()
    expect(upload.can("resume")).toBe(false)
    expect(() => upload.dispatch("resume")).toThrow("Cannot resume while idle")
    expect(upload.getStatus()).toBe("idle")
    expect(upload.can("toString" as never)).toBe(false)
  })
  it("allows retry after failure", () => {
    const upload = new UploadController()
    upload.dispatch("start")
    upload.dispatch("fail")
    expect(upload.getStatus()).toBe("error")
    expect(upload.dispatch("start")).toBe("uploading")
  })
})
