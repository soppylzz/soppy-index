import { test } from "node:test"
import assert from "node:assert/strict"
import { handle as http } from "../lib/handler.ts"

const request = (path: string, init?: RequestInit) =>
  new Request(`http://localhost:5030${path}`, init)

test("HTTP distinguishes media, JSON, schema and byte-limit failures from business acknowledgment", async () => {
  const post = (body: string, type = "application/json") =>
    http(request("/echo", { method: "POST", headers: { "Content-Type": type }, body }))
  assert.equal((await post("text", "text/plain")).status, 415)
  assert.equal((await post("{")).status, 400)
  assert.equal((await post("{}")).status, 422)
  assert.equal((await post(JSON.stringify({ id: "large", text: "中".repeat(200) }))).status, 413)
  const response = await post(JSON.stringify({ id: "ack-1", text: "hello" }))
  assert.equal(response.status, 200)
  const ack = await response.json()
  assert.equal(ack.id, "ack-1")
  assert.equal(ack.accepted, true)
  assert.equal(ack.requestId, response.headers.get("X-Request-Id"))
})

test("HTTP method and HEAD semantics survive migration; streaming emits complete content", async () => {
  const method = await http(request("/echo"))
  assert.equal(method.status, 405)
  assert.equal(method.headers.get("Allow"), "POST")
  assert.equal((await http(request("/missing"))).status, 404)
  const head = await http(request("/stream", { method: "HEAD" }))
  assert.equal(await head.text(), "")
  assert.equal(await (await http(request("/stream"))).text(), "chunk-1\nchunk-2\nchunk-3\n")
})

test("document and local resource boundaries", async () => {
  assert.equal((await http(request("/"))).status, 200)
  assert.equal(await (await http(request("/", { method: "HEAD" }))).text(), "")
  const css = await http(request("/lab/styles.css"))
  assert.equal(css.status, 200)
  assert.match(css.headers.get("Content-Type")!, /text\/css/)
  assert.match(await css.text(), /\.button/)
  assert.equal((await http(request("/lab/http.ts"))).status, 404)
  assert.equal((await http(request("/lab/browser.js", { method: "POST" }))).status, 405)
})
