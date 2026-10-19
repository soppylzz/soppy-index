import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { documents, getSession, sessionCookieName } from "../../../../lib/auth.ts"

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = getSession((await cookies()).get(sessionCookieName)?.value)
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { id } = await context.params
  const document = documents.find((item) => item.id === id)
  if (!document) return NextResponse.json({ error: "not_found" }, { status: 404 })
  if (document.ownerId !== session.userId)
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  return NextResponse.json(document, { headers: { "Cache-Control": "no-store" } })
}
