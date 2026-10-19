import { createHash, generateKeyPairSync, randomBytes, sign, verify } from "node:crypto"
import { bffCallback, issuer, resourceAudience, spaCallback } from "./config.ts"

export const randomValue = () => randomBytes(32).toString("base64url")
export const challengeFor = (value: string) =>
  createHash("sha256").update(value).digest("base64url")
export const demoClientSecret = "local-lab-secret-not-for-production"
export const clients = {
  bff: { redirect: bffCallback, secret: demoClientSecret },
  spa: { redirect: spaCallback, secret: undefined },
}
export type Authorization = {
  clientId: "bff" | "spa"
  redirectUri: string
  challenge: string
  state: string
  nonce: string
  expiresAt: number
}
type Code = Authorization & { subject: string }
export type DeviceGrant = {
  userCode: string
  expiresAt: number
  nextPollAt: number
  interval: number
  status: "pending" | "approved" | "denied"
  subject?: string
}
const globalStore = globalThis as typeof globalThis & {
  securityProvider?: ReturnType<typeof createStore>
}
function createStore() {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048 })
  return {
    keys,
    authorizations: new Map<string, Authorization>(),
    codes: new Map<string, Code>(),
    devices: new Map<string, DeviceGrant>(),
  }
}
export const provider = (globalStore.securityProvider ??= createStore())
export const keyId = "local-lab-key"
export function publicJwk() {
  return {
    ...provider.keys.publicKey.export({ format: "jwk" }),
    kid: keyId,
    alg: "RS256",
    use: "sig",
  }
}
export function issueJwt(claims: Record<string, unknown>, lifetime = 300) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: "RS256", kid: keyId, typ: "JWT" })).toString(
    "base64url"
  )
  const payload = Buffer.from(
    JSON.stringify({ ...claims, iss: issuer, iat: now, exp: now + lifetime })
  ).toString("base64url")
  const input = `${header}.${payload}`
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), provider.keys.privateKey).toString("base64url")}`
}
export type Claims = {
  iss: string
  sub: string
  aud: string
  exp: number
  iat: number
  nonce?: string
  scope?: string
  kind: string
}
export function validateClaims(claims: Claims, audience: string, kind: string, nonce?: string) {
  const now = Math.floor(Date.now() / 1000)
  if (
    claims.iss !== issuer ||
    claims.aud !== audience ||
    claims.kind !== kind ||
    typeof claims.sub !== "string" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now + 5 ||
    (nonce !== undefined && claims.nonce !== nonce)
  )
    throw new Error("Invalid token claims")
  return claims
}
export function verifyResourceToken(token: string) {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid token format")
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString())
  if (
    header.alg !== "RS256" ||
    header.kid !== keyId ||
    !verify(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      provider.keys.publicKey,
      Buffer.from(parts[2], "base64url")
    )
  )
    throw new Error("Invalid signature")
  return validateClaims(
    JSON.parse(Buffer.from(parts[1], "base64url").toString()),
    resourceAudience,
    "access"
  )
}
export function tokenResponse(subject: string, clientId: string, nonce?: string) {
  const service = clientId === "service"
  return {
    access_token: issueJwt({
      sub: subject,
      aud: resourceAudience,
      scope: service ? "jobs:read" : "documents:read",
      kind: "access",
    }),
    token_type: "Bearer",
    expires_in: 300,
    ...(nonce ? { id_token: issueJwt({ sub: subject, aud: clientId, nonce, kind: "id" }) } : {}),
  }
}
export function readAuthorization(params: URLSearchParams): Authorization {
  const clientId = params.get("client_id")
  if (clientId !== "bff" && clientId !== "spa") throw new Error("Unknown client")
  const redirectUri = params.get("redirect_uri")
  const challenge = params.get("code_challenge") ?? ""
  const state = params.get("state") ?? ""
  const nonce = params.get("nonce") ?? ""
  if (
    redirectUri !== clients[clientId].redirect ||
    params.get("response_type") !== "code" ||
    params.get("scope") !== "openid documents:read" ||
    params.get("code_challenge_method") !== "S256" ||
    !/^[A-Za-z0-9_-]{43}$/.test(challenge) ||
    !state ||
    !nonce
  )
    throw new Error("Invalid authorization request")
  return { clientId, redirectUri, challenge, state, nonce, expiresAt: Date.now() + 300_000 }
}
