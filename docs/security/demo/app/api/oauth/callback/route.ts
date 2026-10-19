import { NextRequest, NextResponse } from "next/server"
import { createSession, revokeSession, sessionCookieName } from "../../../../lib/auth.ts"
import { clientOrigin, issuer } from "../../../../lib/config.ts"
import { bffCallback, readJson, transactions, verifyIdToken } from "../../../../lib/oauth-client.ts"
import { demoClientSecret } from "../../../../lib/provider.ts"

export async function GET(request: NextRequest) {
  const state = request.nextUrl.searchParams.get("state") ?? ""
  const transaction = transactions.get(state)
  if (
    !transaction ||
    transaction.expiresAt <= Date.now() ||
    request.cookies.get("oauth-transaction")?.value !== state ||
    request.nextUrl.searchParams.get("iss") !== issuer
  )
    return NextResponse.json({ error: "invalid_transaction" }, { status: 400 })
  transactions.delete(state)
  try {
    if (request.nextUrl.searchParams.has("error")) throw new Error("Authorization denied")
    const code = request.nextUrl.searchParams.get("code")
    if (!code) throw new Error("Missing code")
    const tokens = await readJson(
      await fetch(`${issuer}/provider/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          client_id: "bff",
          client_secret: demoClientSecret,
          code,
          redirect_uri: bffCallback,
          code_verifier: transaction.verifier,
        }),
        signal: AbortSignal.timeout(5000),
      })
    )
    const identity = await verifyIdToken(tokens.id_token, transaction.nonce)
    revokeSession(request.cookies.get(sessionCookieName)?.value)
    const { token } = createSession(identity.sub, "oidc", tokens.access_token)
    const response = NextResponse.redirect(new URL("/account", clientOrigin), 303)
    response.cookies.set(sessionCookieName, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 1800,
    })
    response.cookies.delete("oauth-transaction")
    response.headers.set("Cache-Control", "no-store")
    response.headers.set("Referrer-Policy", "no-referrer")
    return response
  } catch {
    const response = NextResponse.json(
      { error: "oauth_callback_failed" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
    response.cookies.delete("oauth-transaction")
    return response
  }
}
