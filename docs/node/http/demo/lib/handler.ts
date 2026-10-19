import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import { labHead, respond, labAsset, readBody, BodyLimitError } from "./http.ts"

const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>HTTP Route Handler Lab</title>${labHead}</head><body class="demo-page"><main><h1>HTTP: Transport and Business Acknowledgment</h1><section class="card"><p id="identity"></p><p>Compare status, body validation, cancellation and business acknowledgment.</p><button class="button button--secondary" id="valid">Valid JSON</button><button class="button button--secondary" id="invalid">Invalid schema</button><button class="button button--secondary" id="large">Exceed 512 bytes</button><button class="button button--secondary" id="cancel">Cancel slow response</button><button class="button button--secondary" id="stream">Read response stream</button><button class="button button--secondary" id="disconnect">Cancel pending operations</button><p id="status" role="status"></p></section><section class="card"><ol id="log" class="demo-log" role="log" aria-live="polite"></ol></section><script type="module" src="/assets/lab.js"></script></main></body></html>`

function responseStream(request: Request, headers: Headers): Response {
  if (request.method === "HEAD") return respond(request, null, "text/plain", 200, headers)
  const encoder = new TextEncoder()
  let index = 0
  let stopped = false
  let abort = () => {}
  const cleanup = () => {
    stopped = true
    request.signal.removeEventListener("abort", abort)
  }
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      abort = () => {
        if (stopped) return
        cleanup()
        controller.close()
      }
      if (request.signal.aborted) return abort()
      request.signal.addEventListener("abort", abort, { once: true })
    },
    async pull(controller) {
      // One chunk per pull keeps production coupled to downstream demand.
      await delay(30)
      if (stopped) return
      controller.enqueue(encoder.encode(`chunk-${++index}\n`))
      if (index === 3) {
        cleanup()
        controller.close()
      }
    },
    cancel() {
      cleanup()
    },
  })
  return respond(request, stream, "text/plain; charset=utf-8", 200, headers)
}

export async function handle(request: Request): Promise<Response> {
  const asset = labAsset(request)
  if (asset) return asset
  const path = new URL(request.url).pathname
  const requestId = randomUUID()
  const headers = new Headers({ "X-Request-Id": requestId })
  const json = (status: number, value: unknown) =>
    respond(request, JSON.stringify(value), "application/json; charset=utf-8", status, headers)
  if (!["/", "/echo", "/slow", "/stream", "/health"].includes(path))
    return json(404, { error: "Not found" })
  const allowed = path === "/echo" ? ["POST"] : ["GET", "HEAD"]
  if (!allowed.includes(request.method)) {
    headers.set("Allow", allowed.join(", "))
    return json(405, { error: "Method not allowed" })
  }
  if (path === "/") return respond(request, page)
  if (path === "/health") return json(200, { status: "ready" })
  if (path === "/echo") {
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
      return json(415, { error: "Expected application/json" })
    let body: string
    try {
      body = await readBody(request, 512)
    } catch (error) {
      return json(error instanceof BodyLimitError ? 413 : 400, {
        error: error instanceof BodyLimitError ? "Body exceeds 512 bytes" : "Request read failure",
      })
    }
    let value: unknown
    try {
      value = JSON.parse(body)
    } catch {
      return json(400, { error: "Invalid JSON" })
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
    )
      return json(422, { error: "Invalid message schema" })
    console.log(`[http] business-accepted requestId=${requestId}`)
    return json(200, { id: value.id, text: value.text, accepted: true, requestId })
  }
  if (path === "/slow") {
    if (request.method !== "HEAD") {
      try {
        await delay(300, undefined, { signal: request.signal })
      } catch {
        console.log(`[http] downstream-cancelled requestId=${requestId}`)
        return respond(request, null, "text/plain", 499, headers)
      }
    }
    return json(200, { ready: true, requestId })
  }
  return responseStream(request, headers)
}
