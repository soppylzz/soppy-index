import assert from "node:assert/strict"
import { test } from "vitest"
import { matchesValidator, resourceResponse } from "../lib/cache.ts"
import { bumpVersion, snapshot } from "../lib/state.ts"

const etag = '"resource-v2"'
const modified = "Thu, 01 Jan 2026 00:00:02 GMT"

function headers(values: Record<string, string>) {
  return new Headers(values)
}

test("GET validators accept weak/list/star tags and give If-None-Match precedence", () => {
  assert.equal(
    matchesValidator(headers({ "If-None-Match": `"old", W/${etag}` }), etag, modified),
    true
  )
  assert.equal(matchesValidator(headers({ "If-None-Match": "*" }), undefined, undefined), true)
  assert.equal(
    matchesValidator(
      headers({
        "If-None-Match": '"old"',
        "If-Modified-Since": "Fri, 01 Jan 2027 00:00:00 GMT",
      }),
      etag,
      modified
    ),
    false
  )
})

test("date validation rejects invalid and earlier dates", () => {
  assert.equal(
    matchesValidator(headers({ "If-Modified-Since": modified }), undefined, modified),
    true
  )
  assert.equal(
    matchesValidator(headers({ "If-Modified-Since": "invalid" }), undefined, modified),
    false
  )
  assert.equal(
    matchesValidator(
      headers({ "If-Modified-Since": "Thu, 01 Jan 2026 00:00:01 GMT" }),
      undefined,
      modified
    ),
    false
  )
  assert.equal(matchesValidator(new Headers(), etag, modified), false)
})

test("a conditional response has no body; HEAD preserves response headers", async () => {
  const get = resourceResponse(new Request("http://localhost/assets/no-cache.svg"), "no-cache.svg")
  assert.equal(get.status, 200)
  assert.equal(get.headers.get("Cache-Control"), "no-cache")
  const tag = get.headers.get("ETag")!
  assert.match(await get.text(), /data-version="\d+"/)
  const validated = resourceResponse(
    new Request("http://localhost/assets/no-cache.svg", {
      headers: { "If-None-Match": tag },
    }),
    "no-cache.svg"
  )
  assert.equal(validated.status, 304)
  assert.equal(await validated.text(), "")
  const head = resourceResponse(
    new Request("http://localhost/assets/no-cache.svg", { method: "HEAD" }),
    "no-cache.svg"
  )
  assert.equal(head.status, 200)
  assert.equal(head.headers.get("ETag"), tag)
  assert.equal(await head.text(), "")
})

test("changing content invalidates the old ETag and records the actual response", async () => {
  const url = "http://localhost/assets/fresh.svg"
  const before = resourceResponse(new Request(url), "fresh.svg")
  const tag = before.headers.get("ETag")!
  const version = bumpVersion("fresh.svg")
  const changed = resourceResponse(
    new Request(url, { headers: { "If-None-Match": tag } }),
    "fresh.svg"
  )
  assert.equal(changed.status, 200)
  assert.notEqual(changed.headers.get("ETag"), tag)
  assert.match(await changed.text(), new RegExp(`data-version="${version}"`))
  const last = snapshot().requests.at(-1)!
  assert.equal(last.status, 200)
  assert.equal(last.ifNoneMatch, tag)
  assert.equal(last.version, version)
})

test("no-store has no generated validator and unknown resources are not cacheable", () => {
  const response = resourceResponse(
    new Request("http://localhost/assets/no-store.svg"),
    "no-store.svg"
  )
  assert.equal(response.headers.get("Cache-Control"), "no-store")
  assert.equal(response.headers.get("ETag"), null)
  assert.equal(response.headers.get("Last-Modified"), null)
  const missing = resourceResponse(
    new Request("http://localhost/assets/missing.svg"),
    "missing.svg"
  )
  assert.equal(missing.status, 404)
  assert.equal(missing.headers.get("Cache-Control"), "no-store")
})
