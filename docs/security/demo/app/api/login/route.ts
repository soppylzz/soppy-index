import { NextRequest, NextResponse } from "next/server"
import {
  createSession,
  revokeSession,
  sessionCookieName,
  verifyCredentials,
} from "../../../lib/auth.ts"
import { appUrl, demoOrigin, isSameOriginPost } from "../../../lib/request.ts"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 })
  const form = await request.formData()
  const email = form.get("email")
  const password = form.get("password")
  const user =
    typeof email === "string" && typeof password === "string"
      ? verifyCredentials(email, password)
      : undefined
  if (!user) {
    return NextResponse.redirect(appUrl("/login?error=invalid"), 303)
  }
  revokeSession(request.cookies.get(sessionCookieName)?.value)
  const { token } = createSession(user.id)
  const response = NextResponse.redirect(appUrl("/account"), 303)
  response.cookies.set(sessionCookieName, token, {
    httpOnly: true,
    secure: new URL(demoOrigin).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 60,
  })
  response.headers.set("Cache-Control", "no-store")
  return response
}
