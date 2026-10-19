import { test } from "node:test"
import assert from "node:assert/strict"
import { handle as loading } from "../lib/handler.ts"

const request = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:5030${path}`, init)

test("loading emits the recorder and scripts before the delayed DOM tail", async () => {
  const response = await loading(request("/experiment?mode=defer&tail=1"))
  const reader = response.body!.getReader()
  const head = new TextDecoder().decode((await reader.read()).value)
  assert.match(head, /head bootstrap/)
  assert.match(head, /defer/)
  assert.doesNotMatch(head, /id="after"/)
  const tail = new TextDecoder().decode((await reader.read()).value)
  assert.match(tail, /id="after"/)
  assert.equal((await reader.read()).done, true)
  assert.equal((await loading(request("/experiment?mode=unknown"))).status, 400)
})

test("document and local resource boundaries", async () => {
  assert.equal((await loading(request("/"))).status, 200)
  assert.equal(await (await loading(request("/", { method: "HEAD" }))).text(), "")
  const css = await loading(request("/lab/styles.css"))
  assert.equal(css.status, 200)
  assert.match(css.headers.get("Content-Type")!, /text\/css/)
  assert.match(await css.text(), /\.button/)
  assert.equal((await loading(request("/lab/http.ts"))).status, 404)
  assert.equal((await loading(request("/lab/browser.js", { method: "POST" }))).status, 405)
})
