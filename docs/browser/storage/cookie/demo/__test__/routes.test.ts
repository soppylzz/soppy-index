import { test } from "vitest"
import assert from "node:assert/strict"
import { handle as cookie } from "../lib/handler.ts"

const request = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:5030${path}`, init)

test("cookie variants preserve attributes and the separate attacker role", async () => {
  const original = process.env.LAB_ROLE
  try {
    delete process.env.LAB_ROLE
    const response = await cookie(request("/login?variant=hardened"))
    assert.equal(response.status, 302)
    assert.match(response.headers.get("Set-Cookie")!, /HttpOnly; SameSite=Lax/)
    assert.doesNotMatch(
      (await cookie(request("/login?variant=legacy"))).headers.get("Set-Cookie")!,
      /HttpOnly/
    )
    process.env.LAB_ROLE = "evil"
    assert.match(await (await cookie(request("/csrf"))).text(), /http:\/\/localhost:3000\/transfer/)
  } finally {
    if (original === undefined) delete process.env.LAB_ROLE
    else process.env.LAB_ROLE = original
  }
})

test("document and local resource boundaries", async () => {
  assert.equal((await cookie(request("/"))).status, 200)
  assert.equal(await (await cookie(request("/", { method: "HEAD" }))).text(), "")
  const css = await cookie(request("/lab/styles.css"))
  assert.equal(css.status, 200)
  assert.match(css.headers.get("Content-Type")!, /text\/css/)
  assert.match(await css.text(), /\.button/)
  assert.equal((await cookie(request("/lab/http.ts"))).status, 404)
  assert.equal((await cookie(request("/lab/browser.js", { method: "POST" }))).status, 405)
})
