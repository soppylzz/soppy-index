import assert from "node:assert/strict"
import { StringDecoder } from "node:string_decoder"
import { mkdtemp, writeFile, readFile, rm, open } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve, relative, isAbsolute, sep } from "node:path"
import { pathToFileURL, fileURLToPath } from "node:url"
import { log, runLab } from "../lab.ts"

await runLab("files", async () => {
  const text = "\u4e2d\ud83d\ude00"
  const bytes = Buffer.from(text)
  assert.equal(text.length, 3)
  assert.equal(bytes.length, 7)
  const shared = bytes.subarray(0, 3)
  const copy = Buffer.from(shared)
  const previous = bytes[0]
  shared[0] = 65
  assert.equal(bytes[0], 65)
  assert.equal(copy[0], previous)
  log("buffer-view-and-copy", {
    codeUnits: text.length,
    utf8Bytes: Buffer.byteLength(text),
    parentChanged: bytes[0] === 65,
    copyUnchanged: copy[0] === previous,
  })
  const original = Buffer.from(text)
  const chunks = [original.subarray(0, 2), original.subarray(2)]
  const naive = chunks.map((chunk) => chunk.toString("utf8")).join("")
  const decoder = new StringDecoder("utf8")
  const decoded = chunks.map((chunk) => decoder.write(chunk)).join("") + decoder.end()
  assert.notEqual(naive, text)
  assert.equal(decoded, text)
  log("split-utf8", { naive, decoded, restored: decoded === text })
  const directory = await mkdtemp(join(tmpdir(), "node-data-lab-"))
  try {
    const file = join(directory, "space # percent %.txt")
    const url = pathToFileURL(file)
    assert.equal(fileURLToPath(url), file)
    await writeFile(url, "lesson-data", { flag: "wx" })
    const handle = await open(url, "r")
    try {
      const data = await handle.readFile("utf8")
      assert.equal(data, "lesson-data")
      log("file-url-roundtrip", {
        url: url.href,
        data,
        cwdIsModuleDirectory:
          resolve(process.cwd()) === fileURLToPath(new URL(".", import.meta.url)),
      })
    } finally {
      await handle.close()
    }
    const confined = (input: string): string => {
      const candidate = resolve(directory, input)
      const remainder = relative(directory, candidate)
      if (remainder === ".." || remainder.startsWith(`..${sep}`) || isAbsolute(remainder))
        throw new Error("Path outside root")
      return candidate
    }
    assert.throws(() => confined("../escape.txt"), /Path outside root/)
    assert.equal(await readFile(confined("space # percent %.txt"), "utf8"), "lesson-data")
    log("lexical-path-boundary", { traversalRejected: true, symlinkSandbox: false })
  } finally {
    await rm(directory, { recursive: true, force: true })
    log("temporary-directory-removed")
  }
})
