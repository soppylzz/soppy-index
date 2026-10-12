import { execFile } from "node:child_process"
import { promisify } from "node:util"

export function log(event: string, data: unknown = {}): void {
  const line = JSON.stringify({ time: new Date().toISOString(), pid: process.pid, event, data })
  console.log(
    line.replace(
      /[^\x20-\x7e]/g,
      (char) => `\\u${char.charCodeAt(0).toString(16).padStart(4, "0")}`
    )
  )
}
export async function runLab(name: string, run: () => Promise<void>): Promise<void> {
  log("lab-start", {
    name,
    node: process.version,
    observe: "Read actual events and assertions; timing values are observations.",
  })
  try {
    await run()
    log("lab-complete", { name })
  } catch (error) {
    const failure = error as Error & { code?: string }
    log("lab-failed", { name, error: failure.name, message: failure.message, code: failure.code })
    process.exitCode = 1
  }
}
export async function runNode(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return promisify(execFile)(process.execPath, args, { timeout: 5000, maxBuffer: 64 * 1024 })
}
