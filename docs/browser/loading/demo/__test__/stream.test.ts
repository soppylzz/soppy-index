import { test } from "vitest"
import assert from "node:assert/strict"
import { documentStream } from "../lib/http.ts"

const request = (path: string, init?: RequestInit) => new Request(`http://localhost${path}`, init)

test("stream cancellation closes delayed document work without writing to a closed controller", async () => {
  const controller = new AbortController()
  const response = documentStream(request("/", { signal: controller.signal }), "head", "tail", 1000)
  const reader = response.body!.getReader()
  assert.equal(new TextDecoder().decode((await reader.read()).value), "head")
  controller.abort()
  assert.equal((await reader.read()).done, true)
  await reader.cancel()
})
