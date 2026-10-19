import { generateText } from "../../../lib/provider.ts"
import { parseInput, type StreamMessage } from "../../../lib/protocol.ts"

export const runtime = "nodejs"

export async function POST(request: Request) {
  // This local demo accepts only same-origin browser requests.
  const origin = request.headers.get("origin")
  if (origin && origin !== `http://127.0.0.1:${process.env.PORT || 3100}`) {
    return new Response("Origin not allowed", { status: 403 })
  }
  let input
  try {
    input = parseInput(await request.json())
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
  const controller = new AbortController()
  const signal = AbortSignal.any([request.signal, controller.signal])
  const encoder = new TextEncoder()
  const iterator = generateText(input, signal)
  const body = new ReadableStream<Uint8Array>({
    async pull(stream) {
      const send = (message: StreamMessage) => {
        stream.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`))
      }
      try {
        const next = await iterator.next()
        if (signal.aborted) return
        if (next.done) {
          send({ type: "done" })
          stream.close()
        } else send({ type: "delta", text: next.value })
      } catch (error) {
        if (signal.aborted) return
        send({ type: "error", message: (error as Error).message })
        stream.close()
      }
    },
    async cancel() {
      controller.abort()
      await iterator.return()
    },
  })
  return new Response(body, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  })
}
