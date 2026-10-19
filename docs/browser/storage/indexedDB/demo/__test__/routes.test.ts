import { test } from "vitest"
import assert from "node:assert/strict"
import { handle as indexedDB } from "../lib/handler.ts"

const request = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:5030${path}`, init)

test("document and local resource boundaries", async () => {
  assert.equal((await indexedDB(request("/"))).status, 200)
  assert.equal(await (await indexedDB(request("/", { method: "HEAD" }))).text(), "")
  const css = await indexedDB(request("/lab/styles.css"))
  assert.equal(css.status, 200)
  assert.match(css.headers.get("Content-Type")!, /text\/css/)
  assert.match(await css.text(), /\.button/)
  assert.equal((await indexedDB(request("/lab/http.ts"))).status, 404)
  assert.equal((await indexedDB(request("/lab/browser.js", { method: "POST" }))).status, 405)
})
