import { NextResponse } from "next/server"
import { issuer } from "../../../lib/config.ts"
import { provider, randomValue } from "../../../lib/provider.ts"
import { corsHeaders } from "../../../lib/cors.ts"

export async function POST(request: Request) {
  const form = new URLSearchParams(await request.text())
  const headers = { ...corsHeaders(request), "Cache-Control": "no-store" }
  if (form.get("client_id") !== "device" || form.get("scope") !== "documents:read")
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers })
  const deviceCode = randomValue()
  const userCode = randomValue().slice(0, 8).toUpperCase()
  provider.devices.set(deviceCode, {
    userCode,
    expiresAt: Date.now() + 300_000,
    nextPollAt: Date.now() + 5000,
    interval: 5,
    status: "pending",
  })
  return NextResponse.json(
    {
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: `${issuer}/provider/verify`,
      expires_in: 300,
      interval: 5,
    },
    { headers }
  )
}
