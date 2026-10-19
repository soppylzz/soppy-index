import { NextRequest, NextResponse } from "next/server"
import { bffCallback, issuer } from "../../../../lib/config.ts"
import { challengeFor } from "../../../../lib/provider.ts"
import { newTransaction } from "../../../../lib/oauth-client.ts"
import { isSameOriginPost } from "../../../../lib/request.ts"

export function POST(request: NextRequest) {
  if (!isSameOriginPost(request)) return new NextResponse("Forbidden", { status: 403 })
  const transaction = newTransaction()
  const target = new URL(`${issuer}/provider/authorize`)
  target.search = new URLSearchParams({
    client_id: "bff",
    response_type: "code",
    redirect_uri: bffCallback,
    scope: "openid documents:read",
    state: transaction.state,
    nonce: transaction.nonce,
    code_challenge: challengeFor(transaction.verifier),
    code_challenge_method: "S256",
  }).toString()
  const response = NextResponse.redirect(target, 303)
  response.cookies.set("oauth-transaction", transaction.state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  })
  response.headers.set("Cache-Control", "no-store")
  return response
}
