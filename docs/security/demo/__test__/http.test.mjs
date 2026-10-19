import assert from "node:assert/strict"
import { createHash, randomBytes } from "node:crypto"
import { test } from "vitest"

const app = "http://127.0.0.1:3000"
const issuer = "http://127.0.0.1:3001"
const password = "correct-horse-battery-staple"
const secret = "local-lab-secret-not-for-production"
const random = () => randomBytes(32).toString("base64url")
const cookie = (response) =>
  response.headers
    .getSetCookie()
    .map((item) => item.split(";")[0])
    .join("; ")
async function post(url, values, headers = {}) {
  return fetch(url, {
    method: "POST",
    body: new URLSearchParams(values),
    headers,
    redirect: "manual",
    signal: AbortSignal.timeout(30_000),
  })
}
async function authorize(clientId, input) {
  const target = new URL(`${issuer}/provider/authorize`)
  target.search = input.toString()
  const start = await fetch(target, { redirect: "manual" })
  assert.equal(start.status, 303)
  const transaction = new URL(start.headers.get("location")).searchParams.get("transaction")
  const result = await post(
    `${issuer}/provider/authorize`,
    { transaction, email: "alice@example.test", password, decision: "allow" },
    { Origin: issuer, Cookie: cookie(start) }
  )
  assert.equal(result.status, 303)
  return new URL(result.headers.get("location"))
}

test("session, resource authorization, rotation and CSRF", async () => {
  assert.equal((await fetch(`${app}/api/me`)).status, 401)
  assert.equal(
    (await post(`${app}/api/login`, { email: "alice@example.test", password }, { Origin: issuer }))
      .status,
    403
  )
  const login = await post(
    `${app}/api/login`,
    { email: "alice@example.test", password },
    { Origin: app }
  )
  assert.equal(login.status, 303)
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i)
  const first = cookie(login)
  assert.equal((await fetch(`${app}/api/documents/1`, { headers: { Cookie: first } })).status, 200)
  assert.equal((await fetch(`${app}/api/documents/2`, { headers: { Cookie: first } })).status, 403)
  assert.equal(
    (await post(`${app}/api/logout`, { csrf: "wrong" }, { Origin: app, Cookie: first })).status,
    403
  )
  const secondLogin = await post(
    `${app}/api/login`,
    { email: "bob@example.test", password },
    { Origin: app, Cookie: first }
  )
  const second = cookie(secondLogin)
  assert.equal((await fetch(`${app}/api/me`, { headers: { Cookie: first } })).status, 401)
  assert.equal((await fetch(`${app}/api/documents/2`, { headers: { Cookie: second } })).status, 200)
  const page = await (await fetch(`${app}/account`, { headers: { Cookie: second } })).text()
  const csrf = page.match(/name="csrf" value="([^"]+)"/)?.[1]
  assert.ok(csrf)
  assert.equal(
    (await post(`${app}/api/logout`, { csrf }, { Origin: app, Cookie: second })).status,
    303
  )
  assert.equal((await fetch(`${app}/api/me`, { headers: { Cookie: second } })).status, 401)
})

test("BFF performs code exchange, identity validation and resource proxying", async () => {
  const start = await post(`${app}/api/oauth/start`, {}, { Origin: app })
  assert.equal(start.status, 303)
  const input = new URL(start.headers.get("location")).searchParams
  const target = await authorize("bff", input)
  const result = await fetch(target, { headers: { Cookie: cookie(start) }, redirect: "manual" })
  assert.equal(result.status, 303)
  const session = cookie(result)
  const identity = await (await fetch(`${app}/api/me`, { headers: { Cookie: session } })).json()
  assert.equal(identity.source, "oidc")
  assert.equal(identity.userId, "alice")
  const resource = await fetch(`${app}/api/oauth/resource`, { headers: { Cookie: session } })
  assert.equal(resource.status, 200)
  assert.equal((await resource.json()).documents.length, 1)
  assert.equal((await fetch(target, { headers: { Cookie: cookie(start) } })).status, 400)
  assert.equal(
    (await fetch(`${app}/api/oauth/callback?code=forged&state=forged&iss=${issuer}`)).status,
    400
  )
})

test("public client rejects wrong verifier and consumed code; API scopes differ", async () => {
  const verifier = random()
  const input = new URLSearchParams({
    client_id: "spa",
    response_type: "code",
    redirect_uri: `${app}/oauth/spa`,
    scope: "openid documents:read",
    state: random(),
    nonce: random(),
    code_challenge_method: "S256",
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
  })
  const target = await authorize("spa", input)
  const values = {
    grant_type: "authorization_code",
    client_id: "spa",
    code: target.searchParams.get("code"),
    redirect_uri: `${app}/oauth/spa`,
    code_verifier: random(),
  }
  const wrong = await post(`${issuer}/provider/token`, values, { Origin: app })
  assert.equal((await wrong.json()).error, "invalid_grant")
  values.code_verifier = verifier
  const response = await post(`${issuer}/provider/token`, values, { Origin: app })
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("access-control-allow-origin"), app)
  const tokens = await response.json()
  assert.ok(tokens.id_token)
  assert.equal(
    (await (await post(`${issuer}/provider/token`, values)).json()).error,
    "invalid_grant"
  )
  assert.equal(
    (
      await fetch(`${issuer}/provider/resource?view=jobs`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
    ).status,
    403
  )
  const preflight = await fetch(`${issuer}/provider/resource`, {
    method: "OPTIONS",
    headers: {
      Origin: app,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  })
  assert.equal(preflight.headers.get("access-control-allow-origin"), app)
  const untrusted = await fetch(`${issuer}/provider/jwks`, {
    headers: { Origin: "https://untrusted.example" },
  })
  assert.equal(untrusted.headers.get("access-control-allow-origin"), null)
})

test("service identity cannot read user documents", async () => {
  const result = await post(`${app}/api/oauth/service`, {}, { Origin: app })
  assert.equal(result.status, 200)
  assert.equal((await result.json()).subject, "service")
  const tokenResponse = await post(`${issuer}/provider/token`, {
    grant_type: "client_credentials",
    client_id: "service",
    client_secret: secret,
    scope: "jobs:read",
  })
  const { access_token } = await tokenResponse.json()
  assert.equal(
    (
      await fetch(`${issuer}/provider/resource`, {
        headers: { Authorization: `Bearer ${access_token}` },
      })
    ).status,
    403
  )
  assert.equal(
    (
      await post(`${issuer}/provider/token`, {
        grant_type: "client_credentials",
        client_id: "service",
        client_secret: "wrong",
        scope: "jobs:read",
      })
    ).status,
    401
  )
})

test("device authorization exposes pending, approval, consumption and slow down", async () => {
  const device = await (
    await post(`${issuer}/provider/device`, { client_id: "device", scope: "documents:read" })
  ).json()
  const values = {
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    client_id: "device",
    device_code: device.device_code,
  }
  await new Promise((resolve) => setTimeout(resolve, 5100))
  assert.equal(
    (await (await post(`${issuer}/provider/token`, values)).json()).error,
    "authorization_pending"
  )
  const verify = await fetch(`${issuer}/provider/verify`)
  const html = await verify.text()
  const csrf = html.match(/name="csrf" value="([^"]+)"/)[1]
  const approval = await post(
    `${issuer}/provider/verify`,
    { csrf, user_code: device.user_code, email: "alice@example.test", password, decision: "allow" },
    { Origin: issuer, Cookie: cookie(verify) }
  )
  assert.equal(approval.status, 200)
  await new Promise((resolve) => setTimeout(resolve, 5100))
  const result = await post(`${issuer}/provider/token`, values)
  assert.equal(result.status, 200)
  const tokens = await result.json()
  assert.equal(tokens.id_token, undefined)
  assert.equal(
    (
      await fetch(`${issuer}/provider/resource`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      })
    ).status,
    200
  )
  assert.equal(
    (await (await post(`${issuer}/provider/token`, values)).json()).error,
    "expired_token"
  )
  const second = await (
    await post(`${issuer}/provider/device`, { client_id: "device", scope: "documents:read" })
  ).json()
  const rapid = await post(`${issuer}/provider/token`, {
    ...values,
    device_code: second.device_code,
  })
  assert.equal((await rapid.json()).error, "slow_down")
})
