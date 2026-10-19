import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSession, sessionCookieName } from "../../../../lib/auth.ts"
import { issuer } from "../../../../lib/config.ts"

export async function GET() {
  const session = getSession((await cookies()).get(sessionCookieName)?.value)
  if (!session?.accessToken)
    return NextResponse.json({ error: "oidc_session_required" }, { status: 401 })
  try {
    const response = await fetch(`${issuer}/provider/resource`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })
    return NextResponse.json(await response.json(), {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return NextResponse.json({ error: "provider_unavailable" }, { status: 502 })
  }
}
