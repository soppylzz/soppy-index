import { snapshot } from "../../../lib/state.ts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export function GET() {
  return Response.json(snapshot(), { headers: { "Cache-Control": "no-store" } })
}
