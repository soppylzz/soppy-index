export type SSEEvent = { event: string; data: string }

// Network reads may split UTF-8 characters, CRLF pairs, lines, or entire events.
export async function* readSSE(
  stream: ReadableStream<Uint8Array>,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let pending = ""
  let data: string[] = []
  let event = "message"
  let eventSize = 0
  const abort = () => {
    void reader.cancel().catch(() => {})
  }
  signal?.addEventListener("abort", abort, { once: true })
  try {
    while (true) {
      signal?.throwIfAborted()
      const { value, done } = await reader.read()
      signal?.throwIfAborted()
      pending += decoder.decode(value, { stream: !done })
      while (true) {
        const match = /[\r\n]/.exec(pending)
        if (!match) break
        const index = match.index
        if (!done && pending[index] === "\r" && index === pending.length - 1) break
        const line = pending.slice(0, index)
        const separator = pending.slice(index, index + 2) === "\r\n" ? 2 : 1
        pending = pending.slice(index + separator)
        eventSize += line.length
        if (eventSize > 1_048_576) throw new Error("SSE event is too large")
        if (line === "") {
          if (data.length) yield { event, data: data.join("\n") }
          data = []
          event = "message"
          eventSize = 0
        } else if (!line.startsWith(":")) {
          const colon = line.indexOf(":")
          const field = colon < 0 ? line : line.slice(0, colon)
          let content = colon < 0 ? "" : line.slice(colon + 1)
          if (content.startsWith(" ")) content = content.slice(1)
          if (field === "data") data.push(content)
          if (field === "event") event = content || "message"
        }
      }
      if (pending.length + eventSize > 1_048_576) throw new Error("SSE event is too large")
      // An incomplete final event is not dispatched without a blank line.
      if (done) return
    }
  } finally {
    signal?.removeEventListener("abort", abort)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}
