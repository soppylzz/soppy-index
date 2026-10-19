import { NextRequest, NextResponse } from "next/server"
import { getSession, matchesCsrf, revokeSession, sessionCookieName } from "../../../lib/auth.ts"
import { appUrl, isSameOriginPost } from "../../../lib/request.ts"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 })
  const token = request.cookies.get(sessionCookieName)?.value
  const session = getSession(token)
  if (!session) return new NextResponse("Unauthorized", { status: 401 })
  const form = await request.formData()
  const csrf = form.get("csrf")
  if (typeof csrf !== "string" || !matchesCsrf(csrf, session.csrfToken))
    return new NextResponse("Forbidden", { status: 403 })
  revokeSession(token)
  const response = NextResponse.redirect(appUrl("/login"), 303)
  response.cookies.delete(sessionCookieName)
  response.headers.set("Cache-Control", "no-store")
  return response
}
