import { test } from "node:test"
import assert from "node:assert/strict"
import { handle as lifecycle } from "../lib/handler.ts"

const request = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:5030${path}`, init)

test("lifecycle validates reports and retains navigation document fallbacks", async () => {
  const post = (body: string) => lifecycle(request("/api/report", { method: "POST", body }))
  assert.equal((await post("{")).status, 400)
  assert.equal((await post("x".repeat(8193))).status, 413)
  assert.equal((await post(JSON.stringify({ id: "report-1", reason: "test" }))).status, 204)
  const reports = await (await lifecycle(request("/api/reports"))).json()
  assert.equal(reports.at(-1).payload.id, "report-1")
  assert.equal((await lifecycle(request("/history/view/a"))).status, 200)
})

test("document and local resource boundaries", async () => {
  assert.equal((await lifecycle(request("/"))).status, 200)
  assert.equal(await (await lifecycle(request("/", { method: "HEAD" }))).text(), "")
  const css = await lifecycle(request("/lab/styles.css"))
  assert.equal(css.status, 200)
  assert.match(css.headers.get("Content-Type")!, /text\/css/)
  assert.match(await css.text(), /\.button/)
  assert.equal((await lifecycle(request("/lab/http.ts"))).status, 404)
  assert.equal((await lifecycle(request("/lab/browser.js", { method: "POST" }))).status, 405)
})
