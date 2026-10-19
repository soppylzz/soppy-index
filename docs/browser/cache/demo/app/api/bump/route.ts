import { findAsset } from "../../../lib/assets.ts"
import { errorResponse } from "../../../lib/cache.ts"
import { bumpVersion } from "../../../lib/state.ts"

export const runtime = "nodejs"

export function POST(request: Request) {
  const asset = findAsset(new URL(request.url).searchParams.get("asset") ?? "")
  if (!asset) return errorResponse("Unknown asset", 400)
  const version = bumpVersion(asset.name)
  return Response.json({ name: asset.name, version }, { headers: { "Cache-Control": "no-store" } })
}
