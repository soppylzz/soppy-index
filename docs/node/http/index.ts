import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { randomUUID } from "node:crypto"
import {
  demoHead,
  readPort,
  serveDemoAsset,
  startServer,
  logHttpRequest,
} from "../../demo/server.ts"
import { log } from "../lab.ts"

const port = readPort("PORT", 5030, true)
const script = readFileSync(new URL("./assets/lab.js", import.meta.url), "utf8")
const page = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Node HTTP 实验</title>${demoHead}</head><body class="demo-page"><main><h1>Node HTTP：传输与业务确认</h1><section class="card"><p id="identity"></p><p>先发送合法请求，再观察非法结构、超限 body 和取消路径。HTTP 状态与业务 ack 分开记录。</p><button id="valid">合法 JSON</button><button id="invalid">非法结构</button><button id="large">超过 512 字节</button><button id="cancel">取消慢响应</button><button id="stream">读取真实响应流</button><button id="disconnect">取消在途操作</button><p id="status" role="status"></p></section><section class="card"><ol id="log" class="demo-log" role="log" aria-live="polite"></ol></section><script type="module" src="/assets/lab.js"></script></main></body></html>`
const server = createServer((req, res) => {
  if (serveDemoAsset(req, res)) return
  res.once("finish", () => logHttpRequest(req, res.statusCode, "node-http"))
  res.setHeader("Cache-Control", "no-store")
  const requestId = randomUUID()
  res.setHeader("X-Request-Id", requestId)
  let path: string
  try {
    path = new URL(req.url ?? "/", "http://localhost").pathname
  } catch {
    res.writeHead(400)
    res.end("Invalid URL")
    return
  }
  const send = (status: number, value: unknown) => {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" })
    res.end(req.method === "HEAD" ? undefined : JSON.stringify(value))
  }
  const allowed = path === "/echo" ? ["POST"] : ["GET", "HEAD"]
  if (!["/", "/echo", "/slow", "/stream", "/assets/lab.js", "/health"].includes(path)) {
    send(404, { error: "Not found" })
    return
  }
  if (!allowed.includes(req.method ?? "")) {
    res.setHeader("Allow", allowed.join(", "))
    send(405, { error: "Method not allowed" })
    return
  }
  if (path === "/" || path === "/assets/lab.js") {
    res.writeHead(200, {
      "Content-Type": path === "/" ? "text/html; charset=utf-8" : "text/javascript; charset=utf-8",
    })
    res.end(req.method === "HEAD" ? undefined : path === "/" ? page : script)
  } else if (path === "/health") send(200, { status: "ready" })
  else if (path === "/echo") {
    if (req.headers["content-type"]?.split(";")[0].trim() !== "application/json") {
      req.resume()
      send(415, { error: "Expected application/json" })
      return
    }
    const chunks: Buffer[] = []
    let total = 0
    let rejected = false
    req.on("data", (chunk: Buffer) => {
      total += chunk.length
      if (rejected) return
      if (total > 512) {
        rejected = true
        chunks.length = 0
        res.setHeader("Connection", "close")
        send(413, { error: "Body exceeds 512 bytes" })
        log("body-limit-rejected", { requestId })
        return
      }
      chunks.push(chunk)
    })
    req.once("error", () => {
      rejected = true
      chunks.length = 0
      if (!res.headersSent) send(400, { error: "Request read failure" })
    })
    req.once("end", () => {
      if (rejected) return
      let value: unknown
      try {
        value = JSON.parse(Buffer.concat(chunks).toString("utf8"))
      } catch {
        send(400, { error: "Invalid JSON" })
        return
      }
      if (
        !value ||
        typeof value !== "object" ||
        !("id" in value) ||
        typeof value.id !== "string" ||
        value.id.length > 80 ||
        !("text" in value) ||
        typeof value.text !== "string" ||
        value.text.length > 256
      ) {
        send(422, { error: "Invalid message schema" })
        return
      }
      const ack = { id: value.id, accepted: true, text: value.text, requestId }
      log("business-accepted", { requestId, id: value.id })
      send(200, ack)
    })
  } else if (req.method === "HEAD") {
    res.writeHead(200, {
      "Content-Type":
        path === "/slow" ? "application/json; charset=utf-8" : "text/plain; charset=utf-8",
    })
    res.end()
  } else if (path === "/slow") {
    const timer = setTimeout(() => send(200, { ready: true, requestId }), 300)
    res.once("close", () => {
      clearTimeout(timer)
      if (!res.writableFinished) log("downstream-cancelled", { requestId })
    })
  } else {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
    let index = 0
    let writable = true
    const drain = () => {
      writable = true
    }
    res.on("drain", drain)
    const timer = setInterval(() => {
      if (!writable) return
      writable = res.write(`chunk-${++index}\n`)
      if (index === 3) {
        clearInterval(timer)
        res.end()
      }
    }, 30)
    res.once("close", () => {
      clearInterval(timer)
      res.off("drain", drain)
      log("stream-closed", { requestId, finished: res.writableFinished, chunks: index })
    })
  }
})
server.headersTimeout = 5000
server.requestTimeout = 10000
server.keepAliveTimeout = 2000
startServer(server, port, () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  console.log(`Node HTTP browser lab
  Open: http://127.0.0.1:${address.port}/
  Routes: POST /echo; GET /slow, /stream, /health.
  Steps: send valid, invalid and oversized messages; cancel a slow request; read the stream.
  Observe timestamped page logs and Console. HTTP logs prove responses only; business acceptance has a correlated ack.
  Conditions: modern browser; no TLS, proxy or cross-origin experiment.
  PORT overrides the default; PORT=0 selects an available port. Localhost only.
  Press Ctrl+C to stop.`)
})
