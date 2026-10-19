import { readFileSync } from "node:fs"
import { join } from "node:path"

const directory = join(process.cwd(), "assets")
const heroStyles = readFileSync(
  join(process.cwd(), "node_modules/@heroui/styles/dist/heroui.min.css"),
  "utf8"
)
export const labStyles = heroStyles + "\n" + readFileSync(join(directory, "styles.css"), "utf8")

export function ascii(value: string): string {
  return value.replace(
    /[^\x20-\x7e]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`
  )
}

export function respond(
  request: Request,
  body: ConstructorParameters<typeof Response>[0],
  type = "text/html; charset=utf-8",
  status = 200,
  extra: NonNullable<ConstructorParameters<typeof Response>[1]>["headers"] = {}
): Response {
  const headers = new Headers(extra)
  headers.set("Content-Type", type)
  if (!headers.has("Cache-Control")) headers.set("Cache-Control", "no-store")
  return new Response(request.method === "HEAD" || status === 204 || status === 304 ? null : body, {
    status,
    headers,
  })
}

export function labAsset(request: Request): Response | null {
  const path = new URL(request.url).pathname
  if (!path.startsWith("/lab/")) return null
  if (request.method !== "GET" && request.method !== "HEAD")
    return respond(request, "Method not allowed", "text/plain", 405, { Allow: "GET, HEAD" })
  if (path === "/lab/styles.css") return respond(request, labStyles, "text/css; charset=utf-8")
  return respond(request, "Not found", "text/plain", 404)
}

export function documentStream(
  request: Request,
  head: string,
  tail: string,
  delay: number
): Response {
  if (request.method === "HEAD") return respond(request, null)
  const encoder = new TextEncoder()
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  let abort: () => void = () => {}
  const cleanup = () => {
    stopped = true
    clearTimeout(timer)
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
      controller.enqueue(encoder.encode(head))
      timer = setTimeout(() => {
        if (stopped) return
        controller.enqueue(encoder.encode(tail))
        cleanup()
        controller.close()
      }, delay)
    },
    cancel() {
      cleanup()
    },
  })
  return respond(request, stream)
}
