import { NextResponse } from "next/server"
import { documents } from "../../../lib/auth.ts"
import { verifyResourceToken } from "../../../lib/provider.ts"
import { corsHeaders } from "../../../lib/cors.ts"

export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
export function GET(request: Request) {
  const headers = { ...corsHeaders(request), "Cache-Control": "no-store" }
  let claims
  try {
    const value = request.headers.get("authorization")
    if (!value?.startsWith("Bearer ")) throw new Error("Missing credential")
    claims = verifyResourceToken(value.slice(7))
  } catch {
    return NextResponse.json(
      { error: "invalid_token" },
      { status: 401, headers: { ...headers, "WWW-Authenticate": 'Bearer error="invalid_token"' } }
    )
  }
  const scopes = claims.scope?.split(" ") ?? []
  if (new URL(request.url).searchParams.get("view") === "jobs") {
    if (claims.sub !== "service" || !scopes.includes("jobs:read"))
      return NextResponse.json({ error: "insufficient_scope" }, { status: 403, headers })
    return NextResponse.json({ subject: claims.sub, jobs: ["index-documents"] }, { headers })
  }
  if (!scopes.includes("documents:read"))
    return NextResponse.json({ error: "insufficient_scope" }, { status: 403, headers })
  return NextResponse.json(
    {
      subject: claims.sub,
      documents: documents.filter((document) => document.ownerId === claims.sub),
    },
    { headers }
  )
}
