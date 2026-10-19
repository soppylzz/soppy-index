import { PAGE } from "./page.ts"
import { respond, labAsset } from "./http.ts"

export function handle(request: Request): Response {
  const asset = labAsset(request)
  if (asset) return asset
  const path = new URL(request.url).pathname
  if (path === "/favicon.ico") return respond(request, null, "image/x-icon", 204)
  if (path !== "/") return respond(request, "Not found", "text/plain", 404)
  if (request.method !== "GET" && request.method !== "HEAD")
    return respond(request, "Method not allowed", "text/plain", 405, { Allow: "GET, HEAD" })
  return respond(request, PAGE)
}
