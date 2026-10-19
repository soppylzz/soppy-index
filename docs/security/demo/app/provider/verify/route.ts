import { NextRequest, NextResponse } from "next/server"
import { issuer } from "../../../lib/config.ts"
import { provider, randomValue } from "../../../lib/provider.ts"
import { verifyCredentials } from "../../../lib/auth.ts"

export const dynamic = "force-dynamic"

export function GET() {
  const csrf = randomValue()
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authorize a device</title><link rel="stylesheet" href="/hero.css"><body><main>
    <h1>Local provider: authorize a device</h1><p>Only enter a code displayed by a device you are signing in to.</p>
    <p>Demo identities: alice@example.test / bob@example.test. Password: correct-horse-battery-staple</p>
    <form method="post"><input type="hidden" name="csrf" value="${csrf}"><p><label>Device code <input class="input" name="user_code" required></label></p>
    <p><label>Email <input class="input" name="email" type="email" required></label></p><p><label>Password <input class="input" name="password" type="password" required></label></p>
    <button class="button button--secondary" type="submit" name="decision" value="allow">Authenticate and approve</button><button class="button button--secondary" type="submit" name="decision" value="deny">Deny</button></form></main></body></html>`
  const response = new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy":
        "default-src 'none'; style-src 'self'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'",
    },
  })
  response.cookies.set("device-csrf", csrf, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  })
  return response
}
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== issuer)
    return new NextResponse("Forbidden", { status: 403 })
  const form = await request.formData()
  if (!form.get("csrf") || form.get("csrf") !== request.cookies.get("device-csrf")?.value)
    return new NextResponse("Forbidden", { status: 403 })
  const userCode = String(form.get("user_code") ?? "")
    .trim()
    .toUpperCase()
  const device = [...provider.devices.values()].find((entry) => entry.userCode === userCode)
  if (!device || device.expiresAt <= Date.now() || device.status !== "pending")
    return new NextResponse("Unknown, expired or already consumed user code", { status: 400 })
  const email = form.get("email"),
    password = form.get("password")
  const user =
    typeof email === "string" && typeof password === "string"
      ? verifyCredentials(email, password)
      : undefined
  if (!user) return new NextResponse("Invalid credentials", { status: 401 })
  device.status = form.get("decision") === "deny" ? "denied" : "approved"
  device.subject = user.id
  const response = new NextResponse(
    device.status === "approved"
      ? "Device approved. Return to the device and poll for the token."
      : "Device denied.",
    { headers: { "Cache-Control": "no-store" } }
  )
  response.cookies.delete("device-csrf")
  return response
}
