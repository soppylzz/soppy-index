import { spawn, type ChildProcess } from "node:child_process"
import { once } from "node:events"
import { afterAll, beforeAll, expect, it } from "vitest"
import { WebSocket } from "ws"
import { MOCK_TEXT } from "../lib/provider.ts"
import { readSSE } from "../lib/sse.ts"
import { parseMessage, type StreamMessage } from "../lib/protocol.ts"

const port = 15100
const wsPort = 15101
const origin = `http://127.0.0.1:${port}`
let child: ChildProcess
let output = ""

beforeAll(async () => {
  child = spawn(process.execPath, ["server.ts"], {
    cwd: new URL("..", import.meta.url),
    env: {
      ...process.env,
      PORT: String(port),
      WS_PORT: String(wsPort),
      GLM_API_KEY: "",
      NEXT_TELEMETRY_DISABLED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Server startup timed out:\n${output}`)),
      45_000
    )
    child.once("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })
    child.once("exit", () => {
      clearTimeout(timeout)
      reject(new Error(`Server exited:\n${output}`))
    })
    const record = (data: Buffer) => {
      output += data.toString()
      if (output.includes(`WebSocket: ws://127.0.0.1:${wsPort}/ws`)) {
        clearTimeout(timeout)
        resolve()
      }
    }
    child.stdout?.on("data", record)
    child.stderr?.on("data", record)
  })
})

afterAll(async () => {
  if (!child || child.exitCode !== null) return
  const exited = once(child, "exit")
  child.kill("SIGTERM")
  const timeout = setTimeout(() => child.kill("SIGKILL"), 5_000)
  await exited
  clearTimeout(timeout)
})

async function requestSSE(provider = "mock", signal?: AbortSignal) {
  return fetch(`${origin}/api/sse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ prompt: "Hello", provider }),
    signal,
  })
}

function requestWS(provider: string, stopEarly = false) {
  return new Promise<StreamMessage[]>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${wsPort}/ws`, { origin })
    const messages: StreamMessage[] = []
    socket.on("open", () => socket.send(JSON.stringify({ prompt: "Hello", provider })))
    socket.on("message", (data) => {
      const message = parseMessage(data.toString())
      messages.push(message)
      if (stopEarly && message.type === "delta") socket.close()
    })
    socket.on("error", reject)
    socket.on("close", () => resolve(messages))
  })
}

it("serves the Next page and streams SSE incrementally with a final done", async () => {
  const page = await fetch(origin)
  expect(page.status).toBe(200)
  expect(await page.text()).toContain("Two transports.")
  const response = await requestSSE()
  expect(response.headers.get("content-type")).toContain("text/event-stream")
  expect(response.headers.get("cache-control")).toContain("no-transform")
  const iterator = readSSE(response.body!)[Symbol.asyncIterator]()
  const first = parseMessage((await iterator.next()).value!.data)
  expect(first.type).toBe("delta")
  const messages = [first]
  for await (const event of { [Symbol.asyncIterator]: () => iterator })
    messages.push(parseMessage(event.data))
  expect(messages.at(-1)).toEqual({ type: "done" })
  const text = messages
    .filter((message) => message.type === "delta")
    .map((message) => message.text)
    .join("")
  expect(text).toBe(MOCK_TEXT)
  expect(messages.length).toBeGreaterThan(2)
})

it("sends the same content over actual WebSocket messages", async () => {
  const messages = await requestWS("mock")
  expect(messages.at(-1)).toEqual({ type: "done" })
  expect(
    messages
      .filter((message) => message.type === "delta")
      .map((message) => message.text)
      .join("")
  ).toBe(MOCK_TEXT)
})

it("reports missing GLM credentials over both protocols", async () => {
  const response = await requestSSE("glm")
  const messages = []
  for await (const event of readSSE(response.body!)) messages.push(parseMessage(event.data))
  expect(messages).toEqual([{ type: "error", message: expect.stringContaining("GLM_API_KEY") }])
  expect(await requestWS("glm")).toEqual(messages)
})

it("can stop SSE and WS early and start another generation", async () => {
  const controller = new AbortController()
  const response = await requestSSE("mock", controller.signal)
  const iterator = readSSE(response.body!, controller.signal)
  expect(parseMessage((await iterator.next()).value!.data).type).toBe("delta")
  controller.abort()
  await iterator.return(undefined)
  const messages = await requestWS("mock", true)
  expect(messages).toHaveLength(1)
  expect((await requestWS("mock")).at(-1)).toEqual({ type: "done" })
})

it("rejects invalid requests and cross-origin browser requests", async () => {
  const invalid = await fetch(`${origin}/api/sse`, { method: "POST", body: "{}" })
  expect(invalid.status).toBe(400)
  const forbidden = await fetch(`${origin}/api/sse`, {
    method: "POST",
    headers: { Origin: "https://untrusted.example" },
    body: "{}",
  })
  expect(forbidden.status).toBe(403)
  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${wsPort}/ws`, {
      origin: "https://untrusted.example",
    })
    socket.on("unexpected-response", (_request, response) => {
      expect(response.statusCode).toBe(403)
      response.resume()
      socket.terminate()
      resolve()
    })
    socket.on("open", () => reject(new Error("Unexpected cross-origin connection")))
    socket.on("error", () => {})
  })
})
