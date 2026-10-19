import { createPublicKey, verify, type webcrypto } from "node:crypto"
import { bffCallback, issuer } from "./config.ts"
import { randomValue } from "./provider.ts"

export type Transaction = { state: string; verifier: string; nonce: string; expiresAt: number }
const globalStore = globalThis as typeof globalThis & {
  oauthTransactions?: Map<string, Transaction>
}
export const transactions = (globalStore.oauthTransactions ??= new Map<string, Transaction>())
export function newTransaction() {
  const transaction = {
    state: randomValue(),
    verifier: randomValue(),
    nonce: randomValue(),
    expiresAt: Date.now() + 300_000,
  }
  transactions.set(transaction.state, transaction)
  return transaction
}
export async function readJson(response: Response) {
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
  return body
}
export async function verifyIdToken(token: string, nonce: string): Promise<{ sub: string }> {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid token format")
  const header = JSON.parse(Buffer.from(parts[0], "base64url").toString())
  if (header.alg !== "RS256") throw new Error("Unsupported algorithm")
  // The endpoint is pinned configuration; never follow token-provided key URLs.
  const jwks = await readJson(
    await fetch(`${issuer}/provider/jwks`, { cache: "no-store", signal: AbortSignal.timeout(5000) })
  )
  const jwk = jwks.keys.find(
    (key: webcrypto.JsonWebKey & { kid?: string }) => key.kid === header.kid
  )
  if (
    !jwk ||
    !verify(
      "RSA-SHA256",
      Buffer.from(`${parts[0]}.${parts[1]}`),
      createPublicKey({ key: jwk, format: "jwk" }),
      Buffer.from(parts[2], "base64url")
    )
  )
    throw new Error("Invalid signature")
  const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString())
  const now = Math.floor(Date.now() / 1000)
  if (
    claims.iss !== issuer ||
    claims.aud !== "bff" ||
    claims.kind !== "id" ||
    claims.nonce !== nonce ||
    typeof claims.sub !== "string" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now + 5
  )
    throw new Error("Invalid identity claims")
  return { sub: claims.sub }
}
export { bffCallback }
