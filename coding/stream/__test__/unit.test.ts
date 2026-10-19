import { afterEach, describe, expect, it, vi } from "vitest"
import { readSSE } from "../lib/sse.ts"
import { generateText } from "../lib/provider.ts"
import { parseInput, parseMessage } from "../lib/protocol.ts"
import { revealNext } from "../lib/typewriter.ts"

const encoder = new TextEncoder()
function byteStream(text: string) {
  const bytes = encoder.encode(text)
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const byte of bytes) controller.enqueue(Uint8Array.of(byte))
      controller.close()
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("SSE framing", () => {
  it("decodes split UTF-8, split CRLF, comments, multiline data, and multiple events", async () => {
    const events = []
    const stream = byteStream(
      ": heartbeat\r\nevent: delta\r\ndata: 中文👩‍💻\r\ndata: next\r\n\r\ndata: second\n\ndata: incomplete"
    )
    for await (const event of readSSE(stream)) events.push(event)
    expect(events).toEqual([
      { event: "delta", data: "中文👩‍💻\nnext" },
      { event: "message", data: "second" },
    ])
  })

  it("cancels a blocked reader on abort", async () => {
    const cancel = vi.fn()
    const controller = new AbortController()
    const iterator = readSSE(new ReadableStream({ cancel }), controller.signal)
    const pending = iterator.next()
    controller.abort()
    await expect(pending).rejects.toMatchObject({ name: "AbortError" })
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("releases the source when a consumer stops early", async () => {
    const cancel = vi.fn()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("data: first\n\n"))
      },
      cancel,
    })
    for await (const event of readSSE(stream)) {
      expect(event.data).toBe("first")
      break
    }
    expect(cancel).toHaveBeenCalledOnce()
  })

  it("rejects unbounded events", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("x".repeat(1_048_577)))
      },
    })
    await expect(readSSE(stream).next()).rejects.toThrow("too large")
  })
})

describe("GLM adapter", () => {
  it("requests OpenAI-style streaming and extracts content only", async () => {
    vi.stubEnv("GLM_API_KEY", "test-secret")
    vi.stubEnv("GLM_BASE_URL", "https://example.test/v1/")
    vi.stubEnv("GLM_MODEL", "test-model")
    const upstream =
      [
        { choices: [{ delta: { role: "assistant", reasoning_content: "private reasoning" } }] },
        { choices: [{ delta: { content: "你好" } }] },
        { choices: [{ delta: { content: " 👩‍💻" } }] },
        { choices: [{ delta: {}, finish_reason: "stop" }] },
      ]
        .map((value) => `data: ${JSON.stringify(value)}\r\n\r\n`)
        .join("") + "data: [DONE]\n\n"
    const fetcher = vi.fn().mockResolvedValue(
      new Response(byteStream(upstream), {
        headers: { "Content-Type": "text/event-stream" },
      })
    )
    vi.stubGlobal("fetch", fetcher)
    const result = []
    for await (const text of generateText(
      { provider: "glm", prompt: "Hello" },
      new AbortController().signal
    ))
      result.push(text)
    expect(result.join("")).toBe("你好 👩‍💻")
    const [url, options] = fetcher.mock.calls[0]
    expect(url).toBe("https://example.test/v1/chat/completions")
    expect(options.headers.Authorization).toBe("Bearer test-secret")
    expect(JSON.parse(options.body)).toMatchObject({
      model: "test-model",
      stream: true,
      messages: [{ role: "user", content: "Hello" }],
    })
  })

  it("reports missing credentials without falling back to mock", async () => {
    vi.stubEnv("GLM_API_KEY", "")
    await expect(
      generateText({ provider: "glm", prompt: "Hi" }, new AbortController().signal).next()
    ).rejects.toThrow("GLM_API_KEY")
  })

  it("does not expose an upstream error body or accept truncated output as done", async () => {
    vi.stubEnv("GLM_API_KEY", "test-secret")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("sensitive upstream details", { status: 401 }))
    )
    await expect(
      generateText({ provider: "glm", prompt: "Hi" }, new AbortController().signal).next()
    ).rejects.toThrow("HTTP 401")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(byteStream('data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'), {
          headers: { "Content-Type": "text/event-stream" },
        })
      )
    )
    const iterator = generateText({ provider: "glm", prompt: "Hi" }, new AbortController().signal)
    expect((await iterator.next()).value).toBe("partial")
    await expect(iterator.next()).rejects.toThrow("completion marker")
  })
})

it("reveals grapheme clusters rather than UTF-16 halves", () => {
  const target = "中👩‍💻é!"
  expect(revealNext(target, "", 1)).toBe("中")
  expect(revealNext(target, "中", 1)).toBe("中👩‍💻")
  expect(revealNext(target, "中👩‍💻", 1)).toBe("中👩‍💻é")
  expect(revealNext(target, "中👩‍💻é", 8)).toBe(target)
})

it("validates the shared application protocol", () => {
  expect(parseInput({ prompt: " Hello ", provider: "mock" }).prompt).toBe("Hello")
  expect(() => parseInput({ prompt: "", provider: "glm" })).toThrow()
  expect(() => parseInput({ prompt: "Hi", provider: "unknown" })).toThrow()
  expect(() => parseMessage('{"type":"delta","text":1}')).toThrow()
})
