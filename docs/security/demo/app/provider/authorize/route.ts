import { NextRequest, NextResponse } from "next/server"
import { issuer } from "../../../lib/config.ts"
import { provider, randomValue, readAuthorization } from "../../../lib/provider.ts"
import { verifyCredentials } from "../../../lib/auth.ts"

export const runtime = "nodejs"

export function GET(request: NextRequest) {
  try {
    const transaction = randomValue()
    provider.authorizations.set(transaction, readAuthorization(request.nextUrl.searchParams))
    const response = NextResponse.redirect(
      new URL(`/provider/consent?transaction=${transaction}`, issuer),
      303
    )
    response.cookies.set("provider-transaction", transaction, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 300,
    })
    response.headers.set("Cache-Control", "no-store")
    return response
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 })
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== issuer)
    return new NextResponse("Forbidden", { status: 403 })
  const form = await request.formData()
  const transaction = String(form.get("transaction") ?? "")
  const authorization = provider.authorizations.get(transaction)
  if (
    !authorization ||
    authorization.expiresAt <= Date.now() ||
    request.cookies.get("provider-transaction")?.value !== transaction
  )
    return new NextResponse("Invalid or expired transaction", { status: 400 })
  const email = form.get("email"),
    password = form.get("password")
  const user =
    typeof email === "string" && typeof password === "string"
      ? verifyCredentials(email, password)
      : undefined
  if (!user) return new NextResponse("Invalid credentials; use Back to retry", { status: 401 })
  provider.authorizations.delete(transaction)
  const target = new URL(authorization.redirectUri)
  if (form.get("decision") === "deny") target.searchParams.set("error", "access_denied")
  else {
    const code = randomValue()
    provider.codes.set(code, { ...authorization, subject: user.id, expiresAt: Date.now() + 60_000 })
    target.searchParams.set("code", code)
  }
  target.searchParams.set("state", authorization.state)
  target.searchParams.set("iss", issuer)
  const response = NextResponse.redirect(target, 303)
  response.cookies.delete("provider-transaction")
  response.headers.set("Cache-Control", "no-store")
  return response
}
