import assert from "node:assert/strict"
import { Readable, Writable, Transform } from "node:stream"
import { pipeline } from "node:stream/promises"
import { once } from "node:events"
import { log, runLab } from "../lab.ts"

await runLab("streams", async () => {
  let consumed = 0
  let drains = 0
  const sink = new Writable({
    highWaterMark: 4,
    write(chunk: Buffer, _encoding, callback) {
      setTimeout(() => {
        consumed += chunk.length
        callback()
      }, 2)
    },
  })
  sink.on("drain", () => {
    drains++
    log("actual-drain", { writableLength: sink.writableLength })
  })
  const completed = once(sink, "finish")
  for (let index = 0; index < 3; index++) {
    const accepted = sink.write(Buffer.alloc(4, index))
    log("write-return", { index, accepted, writableLength: sink.writableLength })
    if (!accepted) await once(sink, "drain")
  }
  sink.end()
  await completed
  assert.equal(consumed, 12)
  assert.equal(drains, 3)
  log("writable-finished", { consumed, drains })
  const source = Readable.from([Buffer.from("a"), Buffer.from("b")], { objectMode: false })
  const broken = new Transform({
    transform(_chunk, _encoding, callback) {
      callback(new Error("Expected transform failure"))
    },
  })
  const destination = new Writable({
    write(_chunk, _encoding, callback) {
      callback()
    },
  })
  await assert.rejects(pipeline(source, broken, destination), /Expected transform failure/)
  assert(source.destroyed && broken.destroyed && destination.destroyed)
  log("pipeline-failure", {
    sourceDestroyed: source.destroyed,
    transformDestroyed: broken.destroyed,
    destinationDestroyed: destination.destroyed,
  })
  const controller = new AbortController()
  const cancelledSource = Readable.from(
    (async function* () {
      yield Buffer.alloc(4)
      yield Buffer.alloc(4)
    })()
  )
  const cancelledSink = new Writable({
    write(_chunk, _encoding, callback) {
      setTimeout(callback, 5)
    },
  })
  const aborted = pipeline(cancelledSource, cancelledSink, { signal: controller.signal })
  controller.abort()
  await assert.rejects(aborted, { name: "AbortError" })
  log("pipeline-aborted", {
    sourceDestroyed: cancelledSource.destroyed,
    sinkDestroyed: cancelledSink.destroyed,
  })
})
