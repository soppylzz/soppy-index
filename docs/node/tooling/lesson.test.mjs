import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createServer } from "node:http"
import { once } from "node:events"
import { parseCount } from "./config.mjs"

test("configuration accepts limits and rejects malformed input", () => {
  assert.equal(parseCount("0"), 0)
  assert.equal(parseCount("100"), 100)
  for (const value of ["-1", "101", "false", "1.5", ""]) assert.throws(() => parseCount(value))
})
test("file operation cleans its temporary directory", async () => {
  const directory = await mkdtemp(join(tmpdir(), "node-test-lab-"))
  try {
    const path = join(directory, "result.txt")
    await writeFile(path, "observed")
    assert.equal(await readFile(path, "utf8"), "observed")
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
  await assert.rejects(readFile(join(directory, "result.txt")), { code: "ENOENT" })
})
test("HTTP integration checks status, body and shutdown", async () => {
  const server = createServer((_req, res) => {
    res.writeHead(201, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ accepted: true }))
  })
  server.listen(0, "127.0.0.1")
  await once(server, "listening")
  try {
    const address = server.address()
    assert(address && typeof address !== "string")
    const response = await fetch(`http://127.0.0.1:${address.port}/`, {
      signal: AbortSignal.timeout(2000),
    })
    assert.equal(response.status, 201)
    assert.deepEqual(await response.json(), { accepted: true })
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    )
    server.closeAllConnections()
  }
})
