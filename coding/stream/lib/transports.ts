import { parseMessage, type StreamInput, type StreamMessage } from "./protocol.ts"
import { readSSE } from "./sse.ts"

function applyMessage(message: StreamMessage, onDelta: (text: string) => void) {
  if (message.type === "error") throw new Error(message.message)
  if (message.type === "delta") onDelta(message.text)
  return message.type === "done"
}

export async function streamSSE(
  input: StreamInput,
  signal: AbortSignal,
  onDelta: (text: string) => void
) {
  const response = await fetch("/api/sse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
    signal,
  })
  if (!response.ok) throw new Error(`SSE request failed (HTTP ${response.status})`)
  if (!response.body) throw new Error("Response body is missing")
  for await (const event of readSSE(response.body, signal)) {
    if (applyMessage(parseMessage(event.data), onDelta)) return
  }
  throw new Error("SSE connection closed before the done message")
}

export function streamWebSocket(
  input: StreamInput,
  signal: AbortSignal,
  onDelta: (text: string) => void,
  port: number
): Promise<void> {
  signal.throwIfAborted()
  const url = new URL(window.location.href)
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:"
  url.port = String(port)
  url.pathname = "/ws"
  url.search = ""
  url.hash = ""
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    let settled = false
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      signal.removeEventListener("abort", abort)
      socket.close()
      if (error) reject(error)
      else resolve()
    }
    const abort = () => finish(new DOMException("Generation stopped", "AbortError"))
    signal.addEventListener("abort", abort, { once: true })
    socket.onopen = () => {
      if (!settled) socket.send(JSON.stringify(input))
    }
    socket.onmessage = (event) => {
      if (settled) return
      try {
        if (applyMessage(parseMessage(event.data), onDelta)) finish()
      } catch (error) {
        finish(error as Error)
      }
    }
    socket.onerror = () =>
      finish(new Error("WebSocket failed; check that the demo server is running"))
    socket.onclose = () => finish(new Error("WebSocket closed before the done message"))
  })
}
