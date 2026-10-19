import { setTimeout as delay } from "node:timers/promises"
import type { StreamInput } from "./protocol.ts"
import { readSSE } from "./sse.ts"

export const MOCK_TEXT =
  "Streaming separates receiving from rendering.\n\nSSE uses an HTTP event stream. WebSocket carries messages in both directions. Both can feed the same typewriter buffer.\n\n中文、emoji 👩‍💻 and combining marks é should remain readable.\n\nStop cancels the connection and the upstream request."

export async function* generateText(input: StreamInput, signal: AbortSignal) {
  if (input.provider === "mock") {
    const characters = Array.from(MOCK_TEXT)
    for (let index = 0; index < characters.length; index += 7) {
      await delay(40, undefined, { signal })
      yield characters.slice(index, index + 7).join("")
    }
    return
  }
  const key = process.env.GLM_API_KEY
  if (!key) throw new Error("Set GLM_API_KEY in .env.local and restart the server")
  const base = process.env.GLM_BASE_URL || "https://open.bigmodel.cn/api/paas/v4"
  const endpoint = `${base.replace(/\/$/, "")}/chat/completions`
  const timeout = AbortSignal.any([signal, AbortSignal.timeout(120_000)])
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.GLM_MODEL || "glm-4.7",
        messages: [{ role: "user", content: input.prompt }],
        stream: true,
        max_tokens: 1024,
      }),
      signal: timeout,
    })
  } catch {
    signal.throwIfAborted()
    throw new Error("GLM connection failed or timed out; check GLM_BASE_URL and network access")
  }
  if (!response.ok) {
    await response.body?.cancel()
    throw new Error(`GLM returned HTTP ${response.status}; check credentials, model, and quota`)
  }
  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    await response.body?.cancel()
    throw new Error("GLM did not return an SSE response")
  }
  let finished = false
  for await (const event of readSSE(response.body, timeout)) {
    if (event.data === "[DONE]") return
    const chunk = JSON.parse(event.data) as {
      error?: unknown
      choices?: { delta?: { content?: string }; finish_reason?: string | null }[]
    }
    if (chunk.error) throw new Error("GLM reported a streaming error")
    const choice = chunk.choices?.[0]
    if (typeof choice?.delta?.content === "string") yield choice.delta.content
    if (choice?.finish_reason) finished = true
  }
  if (!finished) throw new Error("GLM stream ended before a completion marker")
}
