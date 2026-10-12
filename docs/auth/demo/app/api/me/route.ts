import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { getSession, sessionCookieName } from "../../../lib/auth"

export const runtime = "nodejs"

export async function GET() {
  const token = (await cookies()).get(sessionCookieName)?.value
  const session = getSession(token)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  return NextResponse.json(
    { email: session.email, expiresAt: session.expiresAt },
    { headers: { "Cache-Control": "no-store" } }
  )
}
