export type UploadStatus = "idle" | "uploading" | "paused" | "success" | "error"
export type UploadEvent = "start" | "pause" | "resume" | "succeed" | "fail" | "reset"

const transitions: Record<UploadStatus, Partial<Record<UploadEvent, UploadStatus>>> = {
  idle: { start: "uploading" },
  uploading: { pause: "paused", succeed: "success", fail: "error" },
  paused: { resume: "uploading", reset: "idle" },
  success: { reset: "idle" },
  error: { start: "uploading", reset: "idle" },
}

export class UploadController {
  private status: UploadStatus = "idle"

  getStatus(): UploadStatus {
    return this.status
  }

  can(event: UploadEvent): boolean {
    return Object.hasOwn(transitions[this.status], event)
  }

  dispatch(event: UploadEvent): UploadStatus {
    if (!this.can(event)) throw new Error(`Cannot ${event} while ${this.status}`)
    this.status = transitions[this.status][event]!
    return this.status
  }
}
