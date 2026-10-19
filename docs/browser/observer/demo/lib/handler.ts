import { page, experiments } from "./page.ts"
import { respond, labAsset } from "./http.ts"

export function handle(request: Request): Response {
  const asset = labAsset(request)
  if (asset) return asset
  const path = new URL(request.url).pathname
  if (request.method !== "GET" && request.method !== "HEAD")
    return respond(request, "Method not allowed", "text/plain", 405, { Allow: "GET, HEAD" })
  if (path === "/favicon.ico") return respond(request, null, "image/x-icon", 204)
  if (path === "/" || Object.hasOwn(experiments, path.slice(1)))
    return respond(
      request,
      page(path === "/" ? "home" : (path.slice(1) as keyof typeof experiments))
    )
  return respond(request, "Not found", "text/plain", 404)
}
