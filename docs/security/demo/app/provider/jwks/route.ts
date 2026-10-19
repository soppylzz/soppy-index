import { NextResponse } from "next/server"
import { publicJwk } from "../../../lib/provider.ts"
import { corsHeaders } from "../../../lib/cors.ts"

export function GET(request: Request) {
  return NextResponse.json(
    { keys: [publicJwk()] },
    { headers: { ...corsHeaders(request), "Cache-Control": "no-store" } }
  )
}
