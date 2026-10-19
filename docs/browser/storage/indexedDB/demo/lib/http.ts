import { readFileSync } from "node:fs"
import { join } from "node:path"

const directory = join(process.cwd(), "assets")
const heroStyles = readFileSync(
  join(process.cwd(), "node_modules/@heroui/styles/dist/heroui.min.css"),
  "utf8"
)
export const labStyles = heroStyles + "\n" + readFileSync(join(directory, "styles.css"), "utf8")
const browserScript = readFileSync(join(directory, "browser.js"), "utf8")
export const labHead =
  '<link rel="stylesheet" href="/lab/styles.css"><script src="/lab/browser.js"></script>'

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
  if (path === "/lab/browser.js")
    return respond(request, browserScript, "text/javascript; charset=utf-8")
  return respond(request, "Not found", "text/plain", 404)
}
