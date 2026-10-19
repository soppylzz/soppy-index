import { findAsset } from "./assets.ts"
import { recordRequest, versionOf } from "./state.ts"

// Synthetic dates make second-resolution Last-Modified changes reproducible.
const lastModifiedEpoch = Date.UTC(2026, 0, 1)

export function matchesValidator(
  headers: Headers,
  etag: string | undefined,
  lastModified: string | undefined
): boolean {
  const ifNoneMatch = headers.get("if-none-match")
  if (ifNoneMatch !== null) {
    return ifNoneMatch.split(",").some((candidate) => {
      const tag = candidate.trim()
      return tag === "*" || (etag !== undefined && tag.replace(/^W\//, "") === etag)
    })
  }
  const ifModifiedSince = headers.get("if-modified-since")
  if (ifModifiedSince === null || lastModified === undefined) return false
  const seen = Date.parse(ifModifiedSince)
  return Number.isFinite(seen) && seen >= Date.parse(lastModified)
}

export function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } })
}

export function resourceResponse(request: Request, name: string): Response {
  const asset = findAsset(name)
  if (!asset) return errorResponse("Unknown asset", 404)
  const version = versionOf(asset.name)
  const etag = asset.etag ? `"${asset.name}-v${version}"` : undefined
  const lastModified = asset.lastModified
    ? new Date(lastModifiedEpoch + version * 1000).toUTCString()
    : undefined
  const headers = new Headers({
    "Cache-Control": asset.policy,
    "Content-Type": "image/svg+xml; charset=utf-8",
  })
  if (etag !== undefined) headers.set("ETag", etag)
  if (lastModified !== undefined) headers.set("Last-Modified", lastModified)
  const status = matchesValidator(request.headers, etag, lastModified) ? 304 : 200
  recordRequest({
    name: asset.name,
    method: request.method,
    status,
    version,
    ifNoneMatch: request.headers.get("if-none-match"),
    ifModifiedSince: request.headers.get("if-modified-since"),
  })
  const body =
    status === 304 || request.method === "HEAD"
      ? null
      : `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="56" data-version="${version}"><rect width="220" height="56" rx="8" fill="#e9ecef"/><text x="110" y="33" text-anchor="middle" font-family="sans-serif" font-size="15" fill="#343a40">${asset.name} v${version}</text></svg>`
  return new Response(body, { status, headers })
}
