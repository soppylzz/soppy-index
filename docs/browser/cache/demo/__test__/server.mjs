import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { resolve } from "node:path"

export async function startLab(directory, port, environment = {}) {
  const cwd = resolve(directory)
  const next = createRequire(resolve(cwd, "package.json")).resolve("next/dist/bin/next")
  const child = spawn(process.execPath, [next, "start", "-H", "127.0.0.1", "-p", String(port)], {
    cwd,
    env: { ...process.env, LAB_ROLE: "bank", ...environment },
    stdio: ["ignore", "pipe", "pipe"],
  })
  let logs = ""
  try {
    await new Promise((resolveReady, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Server did not become ready: ${logs}`)),
        15_000
      )
      const read = (chunk) => {
        logs += chunk
        if (logs.includes("Ready in")) {
          clearTimeout(timeout)
          resolveReady()
        }
      }
      child.stdout.on("data", read)
      child.stderr.on("data", read)
      child.once("error", (error) => {
        clearTimeout(timeout)
        reject(error)
      })
      child.once("exit", (code) => {
        clearTimeout(timeout)
        reject(new Error(`Server exited (${code}): ${logs}`))
      })
    })
  } catch (error) {
    child.kill("SIGTERM")
    throw error
  }
  return {
    url: `http://127.0.0.1:${port}`,
    close: async () => {
      if (child.exitCode !== null || child.signalCode !== null) return
      await new Promise((resolveExit) => {
        child.once("exit", resolveExit)
        child.kill("SIGTERM")
      })
    },
  }
}
