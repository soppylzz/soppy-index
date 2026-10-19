import { NextResponse } from "next/server"
import { issuer } from "../../../../lib/config.ts"
import { demoClientSecret } from "../../../../lib/provider.ts"
import { readJson } from "../../../../lib/oauth-client.ts"
import { isSameOriginPost } from "../../../../lib/request.ts"

export async function POST(request: Request) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 })
  try {
    const token = await readJson(
      await fetch(`${issuer}/provider/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: "service",
          client_secret: demoClientSecret,
          scope: "jobs:read",
        }),
        signal: AbortSignal.timeout(5000),
      })
    )
    const result = await readJson(
      await fetch(`${issuer}/provider/resource?view=jobs`, {
        headers: { Authorization: `Bearer ${token.access_token}` },
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      })
    )
    return NextResponse.json(
      { flow: "client_credentials", ...result },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch {
    return NextResponse.json({ error: "service_call_failed" }, { status: 502 })
  }
}
