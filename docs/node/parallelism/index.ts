import assert from "node:assert/strict"
import { Worker } from "node:worker_threads"
import { randomUUID } from "node:crypto"
import { log, runLab, runNode } from "../lab.ts"

await runLab("parallelism", async () => {
  const worker = new Worker(new URL("./worker.ts", import.meta.url))
  try {
    const request = (
      mode: string,
      extra: object = {},
      transfer: ArrayBuffer[] = [],
      timeout = 1000
    ) =>
      new Promise<{ id: string; ok: boolean; result: number; threadId: number }>(
        (resolve, reject) => {
          const id = randomUUID()
          const cleanup = () => {
            clearTimeout(timer)
            worker.off("message", receive)
            worker.off("error", fail)
            worker.off("exit", exit)
          }
          const receive = (message: {
            id: string
            ok: boolean
            result: number
            threadId: number
          }) => {
            if (message?.id !== id) return
            if (
              typeof message.ok !== "boolean" ||
              (message.ok &&
                (typeof message.result !== "number" || typeof message.threadId !== "number"))
            ) {
              fail(new Error("Invalid worker ack"))
              return
            }
            cleanup()
            resolve(message)
          }
          const fail = (error: Error) => {
            cleanup()
            reject(error)
          }
          const exit = (code: number) => fail(new Error(`Worker exited before ack: ${code}`))
          const timer = setTimeout(() => fail(new Error("Worker ack timeout")), timeout)
          worker.on("message", receive)
          worker.once("error", fail)
          worker.once("exit", exit)
          try {
            worker.postMessage({ id, mode, ...extra }, transfer)
          } catch (error) {
            fail(error as Error)
          }
        }
      )
    const sum = await request("sum")
    assert.equal(sum.result, 1250025000)
    log("worker-cpu-ack", sum)
    const buffer = new ArrayBuffer(4)
    new Uint8Array(buffer)[0] = 42
    const transfer = request("transfer", { buffer }, [buffer])
    assert.equal(buffer.byteLength, 0)
    const transferResult = await transfer
    assert.equal(transferResult.result, 42)
    log("transfer-ownership", { senderByteLength: buffer.byteLength, ack: transferResult })
    const shared = new SharedArrayBuffer(4)
    const sharedResult = await request("shared", { shared })
    assert.equal(Atomics.load(new Int32Array(shared), 0), 1)
    log("shared-memory-atomic", {
      senderValue: Atomics.load(new Int32Array(shared), 0),
      ack: sharedResult,
    })
    const rejected = await request("invalid")
    assert.equal(rejected.ok, false)
    log("worker-schema-rejected", rejected)
    assert.equal((await request("transfer")).ok, false)
    await assert.rejects(request("silent", {}, [], 40), /Worker ack timeout/)
    assert.equal(worker.listenerCount("message"), 0)
    log("worker-timeout-cleanup", {
      remainingMessageListeners: worker.listenerCount("message"),
      workerAutomaticallyCancelled: false,
    })
  } finally {
    const code = await worker.terminate()
    log("worker-terminated", { code, remainingMessageListeners: worker.listenerCount("message") })
  }
  const { stdout } = await runNode([
    "--input-type=module",
    "-e",
    "console.log(JSON.stringify({pid:process.pid,parent:process.ppid,value:6*7}))",
  ])
  const child = JSON.parse(stdout) as { pid: number; parent: number; value: number }
  assert.notEqual(child.pid, process.pid)
  assert.equal(child.value, 42)
  log("child-process-isolation", child)
})
