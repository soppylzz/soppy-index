import { NextResponse } from "next/server"
import {
  challengeFor,
  clients,
  demoClientSecret,
  provider,
  tokenResponse,
} from "../../../lib/provider.ts"
import { corsHeaders } from "../../../lib/cors.ts"

export const runtime = "nodejs"
export function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) })
}
export async function POST(request: Request) {
  const headers = { ...corsHeaders(request), "Cache-Control": "no-store", Pragma: "no-cache" }
  const fail = (error: string, status = 400, extra = {}) =>
    NextResponse.json({ error, ...extra }, { status, headers })
  if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded"))
    return fail("invalid_request")
  const form = new URLSearchParams(await request.text())
  const grant = form.get("grant_type"),
    clientId = form.get("client_id")
  if (grant === "client_credentials") {
    if (clientId !== "service" || form.get("client_secret") !== demoClientSecret)
      return fail("invalid_client", 401)
    if (form.get("scope") !== "jobs:read") return fail("invalid_scope")
    return NextResponse.json(tokenResponse("service", "service"), { headers })
  }
  if (grant === "urn:ietf:params:oauth:grant-type:device_code") {
    if (clientId !== "device") return fail("invalid_client", 401)
    const code = form.get("device_code") ?? ""
    const device = provider.devices.get(code)
    if (!device || device.expiresAt <= Date.now()) {
      provider.devices.delete(code)
      return fail("expired_token")
    }
    if (Date.now() < device.nextPollAt) {
      device.interval += 5
      device.nextPollAt = Date.now() + device.interval * 1000
      return fail("slow_down", 400, { interval: device.interval })
    }
    device.nextPollAt = Date.now() + device.interval * 1000
    if (device.status === "pending") return fail("authorization_pending")
    provider.devices.delete(code)
    if (device.status === "denied") return fail("access_denied")
    return NextResponse.json(tokenResponse(device.subject!, "device"), { headers })
  }
  if (grant !== "authorization_code") return fail("unsupported_grant_type")
  if (clientId !== "bff" && clientId !== "spa") return fail("invalid_client", 401)
  if (clients[clientId].secret && form.get("client_secret") !== clients[clientId].secret)
    return fail("invalid_client", 401)
  const code = form.get("code") ?? ""
  const authorization = provider.codes.get(code)
  const verifier = form.get("code_verifier") ?? ""
  if (
    !authorization ||
    authorization.expiresAt <= Date.now() ||
    authorization.clientId !== clientId ||
    authorization.redirectUri !== form.get("redirect_uri") ||
    !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier) ||
    authorization.challenge !== challengeFor(verifier)
  )
    return fail("invalid_grant")
  // Consumption and issuance are synchronous in this single-process teaching store.
  provider.codes.delete(code)
  return NextResponse.json(tokenResponse(authorization.subject, clientId, authorization.nonce), {
    headers,
  })
}
