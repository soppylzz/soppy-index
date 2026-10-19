import { test } from "vitest"
import assert from "node:assert/strict"
import { fileURLToPath } from "node:url"
import { startLab } from "./server.mjs"

test("HeroUI login retains native POST field names and submit behavior", async () => {
  const lab = await startLab(fileURLToPath(new URL("..", import.meta.url)), 15080)
  try {
    const response = await fetch(`${lab.url}/login`)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /<form[^>]*action="\/api\/login"/)
    assert.match(html, /name="email"/)
    assert.match(html, /name="password"/)
    assert.match(html, /<button[^>]*type="submit"/)
    assert.match(html, /class="[^"]*input/)
    const query = new URLSearchParams({
      client_id: "spa",
      response_type: "code",
      redirect_uri: "http://127.0.0.1:3000/oauth/spa",
      scope: "openid documents:read",
      code_challenge_method: "S256",
      code_challenge: "a".repeat(43),
      state: "ui-state",
      nonce: "ui-nonce",
    })
    const start = await fetch(`${lab.url}/provider/authorize?${query}`, { redirect: "manual" })
    assert.equal(start.status, 303)
    const target = new URL(start.headers.get("Location"))
    const consent = await fetch(`${lab.url}${target.pathname}${target.search}`)
    const consentHtml = await consent.text()
    assert.equal(consent.status, 200)
    assert.match(consentHtml, /name="email"/)
    assert.match(consentHtml, /class="[^"]*select/)
    assert.match(consentHtml, /value="alice@example.test"/)
    const submitButtons = consentHtml.match(/<button[^>]*>/g) ?? []
    assert.ok(
      submitButtons.some(
        (button) =>
          /type="submit"/.test(button) &&
          /name="decision"/.test(button) &&
          /value="allow"/.test(button)
      )
    )
    const verification = await fetch(`${lab.url}/provider/verify`)
    const policy = verification.headers.get("Content-Security-Policy")
    assert.match(policy, /default-src 'none'/)
    assert.match(policy, /style-src 'self'/)
    assert.doesNotMatch(policy, /unsafe-inline|unsafe-eval/)
    const form = await verification.text()
    assert.match(form, /class="button button--secondary"/)
    assert.match(form, /type="hidden" name="csrf"/)
    const css = await fetch(`${lab.url}/hero.css`)
    assert.equal(css.status, 200)
    assert.match(await css.text(), /\.button/)
  } finally {
    await lab.close()
  }
})
