"use client"

import { Button } from "../../ui"

import { useState } from "react"
import { clientOrigin, issuer, spaCallback } from "../../../lib/config.ts"

type Transaction = { state: string; nonce: string; verifier: string; createdAt: number }
function randomValue() {
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "")
}
function decode(value: string) {
  return Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), (char) =>
    char.charCodeAt(0)
  )
}
async function json(response: Response) {
  const body = await response.json()
  if (!response.ok) throw new Error(body.error ?? `HTTP ${response.status}`)
  return body
}
async function verifyIdentity(token: string, nonce: string) {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid ID token format")
  const header = JSON.parse(new TextDecoder().decode(decode(parts[0])))
  if (header.alg !== "RS256") throw new Error("Unsupported algorithm")
  const jwks = await json(await fetch(`${issuer}/provider/jwks`))
  const jwk = jwks.keys.find((key: JsonWebKey & { kid?: string }) => key.kid === header.kid)
  if (!jwk) throw new Error("Unknown key")
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  )
  if (
    !(await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      key,
      decode(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
    ))
  )
    throw new Error("Invalid signature")
  const claims = JSON.parse(new TextDecoder().decode(decode(parts[1])))
  const now = Math.floor(Date.now() / 1000)
  if (
    claims.iss !== issuer ||
    claims.aud !== "spa" ||
    claims.kind !== "id" ||
    claims.nonce !== nonce ||
    typeof claims.sub !== "string" ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now + 5
  )
    throw new Error("Invalid identity claims")
  return claims.sub as string
}
export default function SpaPage() {
  const [result, setResult] = useState(
    "Start authorization, then complete the callback after returning here."
  )
  const [accessToken, setAccessToken] = useState<string>()
  const [busy, setBusy] = useState(false)
  async function start() {
    try {
      const transaction: Transaction = {
        state: randomValue(),
        nonce: randomValue(),
        verifier: randomValue(),
        createdAt: Date.now(),
      }
      const digest = new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(transaction.verifier))
      )
      const challenge = btoa(String.fromCharCode(...digest))
        .replaceAll("+", "-")
        .replaceAll("/", "_")
        .replaceAll("=", "")
      sessionStorage.setItem("spa-transaction", JSON.stringify(transaction))
      const query = new URLSearchParams({
        client_id: "spa",
        response_type: "code",
        redirect_uri: spaCallback,
        scope: "openid documents:read",
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
      })
      location.assign(`${issuer}/provider/authorize?${query}`)
    } catch (error) {
      setResult(String(error))
    }
  }
  async function complete() {
    if (busy) return
    setBusy(true)
    try {
      const raw = sessionStorage.getItem("spa-transaction")
      if (!raw) throw new Error("No pending transaction")
      const transaction: Transaction = JSON.parse(raw)
      const params = new URLSearchParams(location.search)
      if (
        params.get("state") !== transaction.state ||
        params.get("iss") !== issuer ||
        Date.now() - transaction.createdAt > 300_000
      )
        throw new Error("Invalid or expired callback")
      sessionStorage.removeItem("spa-transaction")
      history.replaceState(null, "", `${clientOrigin}/oauth/spa`)
      if (params.has("error")) throw new Error(params.get("error")!)
      const code = params.get("code")
      if (!code) throw new Error("Missing code")
      const tokens = await json(
        await fetch(`${issuer}/provider/token`, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            client_id: "spa",
            redirect_uri: spaCallback,
            code,
            code_verifier: transaction.verifier,
          }),
        })
      )
      const subject = await verifyIdentity(tokens.id_token, transaction.nonce)
      setAccessToken(tokens.access_token)
      setResult(`Validated identity: ${subject}. Access token is held in component memory.`)
    } catch (error) {
      setResult(String(error))
    } finally {
      setBusy(false)
    }
  }
  async function resource() {
    try {
      const response = await fetch(`${issuer}/provider/resource`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      setResult(JSON.stringify(await json(response), null, 2))
    } catch (error) {
      setResult(String(error))
    }
  }
  return (
    <>
      <h1>Public SPA: OIDC + PKCE</h1>
      <p>
        No client secret is used. Transaction state is in sessionStorage; tokens remain in memory.
      </p>
      <nav>
        <Button onPress={start}>Start authorization</Button>
        <Button onPress={complete} isDisabled={busy}>
          Complete callback
        </Button>
        <Button onPress={resource} isDisabled={!accessToken}>
          Read own documents
        </Button>
        <Button
          onPress={() => {
            setAccessToken(undefined)
            setResult(
              "Local token reference cleared; the issued token itself has not been revoked."
            )
          }}
        >
          Clear local token
        </Button>
      </nav>
      <pre role="status">{result}</pre>
    </>
  )
}
