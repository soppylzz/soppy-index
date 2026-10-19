import assert from "node:assert/strict"
import { test } from "vitest"
import { challengeFor, issueJwt, readAuthorization, verifyResourceToken } from "../lib/provider.ts"
import { spaCallback } from "../lib/config.ts"

test("resource token validation rejects signature, audience, type and expiration errors", () => {
  const claims = { sub: "alice", aud: "documents-api", kind: "access", scope: "documents:read" }
  assert.equal(verifyResourceToken(issueJwt(claims)).sub, "alice")
  assert.throws(() => verifyResourceToken(issueJwt({ ...claims, aud: "another-api" })))
  assert.throws(() => verifyResourceToken(issueJwt({ ...claims, kind: "id" })))
  assert.throws(() => verifyResourceToken(issueJwt(claims, -1)))
  assert.throws(() => verifyResourceToken(issueJwt({ ...claims, sub: null })))
  const parts = issueJwt(claims).split(".")
  parts[1] = Buffer.from(JSON.stringify({ ...claims, sub: "bob" })).toString("base64url")
  assert.throws(() => verifyResourceToken(parts.join(".")))
})

test("authorization binds registered redirect, client and S256 challenge", () => {
  const request = new URLSearchParams({
    client_id: "spa",
    response_type: "code",
    redirect_uri: spaCallback,
    scope: "openid documents:read",
    code_challenge_method: "S256",
    code_challenge: challengeFor("a".repeat(43)),
    state: "state",
    nonce: "nonce",
  })
  assert.equal(readAuthorization(request).clientId, "spa")
  request.set("redirect_uri", `${spaCallback}/other`)
  assert.throws(() => readAuthorization(request))
  request.set("redirect_uri", spaCallback)
  request.set("code_challenge_method", "plain")
  assert.throws(() => readAuthorization(request))
})
