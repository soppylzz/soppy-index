import { readFileSync } from "node:fs"
import type { IncomingMessage, Server, ServerResponse } from "node:http"

export const demoStyles = readFileSync(new URL("./styles.css", import.meta.url), "utf8")
const browserScript = readFileSync(new URL("./browser.js", import.meta.url), "utf8")
export const demoHead =
  '<link rel="stylesheet" href="/demo/styles.css"><script src="/demo/browser.js"></script>'

export function readPort(name: string, fallback: number, allowZero = false): number {
  const raw = process.env[name] ?? String(fallback)
  const value = Number(raw)
  const minimum = allowZero ? 0 : 1
  if (!/^\d+$/.test(raw) || !Number.isInteger(value) || value < minimum || value > 65535) {
    throw new Error(`${name} must be an integer between ${minimum} and 65535`)
  }
  return value
}

export function assertDistinctPorts(...ports: number[]): void {
  if (new Set(ports).size !== ports.length) throw new Error("Demo ports must be distinct")
}

export function listenOnLoopback(server: Server, port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => {
      server.off("error", onError)
      server.off("listening", onListening)
      reject(error)
    }
    const onListening = () => {
      server.off("error", onError)
      const address = server.address()
      if (!address || typeof address === "string") {
        reject(new Error("Expected a loopback TCP address"))
        return
      }
      resolve(address.port)
    }
    server.once("error", onError)
    server.once("listening", onListening)
    try {
      server.listen(port, "127.0.0.1")
    } catch (error) {
      onError(error as Error)
    }
  })
}

export function closeServers(...servers: Server[]): void {
  for (const server of servers) {
    server.close()
    server.closeIdleConnections()
  }
}

export function reportServerError(error: NodeJS.ErrnoException): void {
  console.error(
    error.code === "EADDRINUSE"
      ? "Port conflict. Choose a free port using the demo environment variables."
      : `Server failed: ${ascii(error.message)}`
  )
  process.exitCode = 1
}

export function startServer(server: Server, port: number, ready: () => void): void {
  const shutdown = () => closeServers(server)
  void listenOnLoopback(server, port)
    .then(() => {
      server.on("error", (error) => {
        reportServerError(error)
        shutdown()
      })
      process.once("SIGINT", shutdown)
      process.once("SIGTERM", shutdown)
      ready()
    })
    .catch((error: NodeJS.ErrnoException) => {
      reportServerError(error)
      shutdown()
    })
}

export function serveDemoAsset(req: IncomingMessage, res: ServerResponse): boolean {
  const path = (req.url ?? "/").split("?", 1)[0]
  if (!path.startsWith("/demo/")) return false
  res.once("finish", () => logHttpRequest(req, res.statusCode, "demo-assets"))
  res.setHeader("Cache-Control", "no-store")
  let status = 200
  let mime = "text/plain; charset=utf-8"
  let body: string
  if (req.method !== "GET" && req.method !== "HEAD") {
    status = 405
    res.setHeader("Allow", "GET, HEAD")
    body = "Method not allowed"
  } else if (path === "/demo/styles.css") {
    mime = "text/css; charset=utf-8"
    body = demoStyles
  } else if (path === "/demo/browser.js") {
    mime = "text/javascript; charset=utf-8"
    body = browserScript
  } else {
    status = 404
    body = "Not found"
  }
  res.writeHead(status, { "Content-Type": mime })
  res.end(req.method === "HEAD" ? undefined : body)
  return true
}

export function ascii(value: string): string {
  return value.replace(
    /[^\x20-\x7e]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  )
}

export function logHttpRequest(
  req: IncomingMessage,
  status: number,
  label: string,
  note = ""
): void {
  console.log(
    `[${ascii(label)}] ${ascii(req.method ?? "UNKNOWN")} ${ascii(req.url ?? "/")} -> ${status}${note ? ` ${ascii(note)}` : ""}`
  )
}
