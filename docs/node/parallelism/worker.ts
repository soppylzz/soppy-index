import { parentPort, threadId } from "node:worker_threads"
if (!parentPort) throw new Error("Worker entry only")
parentPort.on(
  "message",
  (message: { id?: unknown; mode?: unknown; buffer?: ArrayBuffer; shared?: SharedArrayBuffer }) => {
    if (
      typeof message?.id !== "string" ||
      !["sum", "transfer", "shared", "silent"].includes(String(message.mode)) ||
      (message.mode === "transfer" &&
        (!(message.buffer instanceof ArrayBuffer) || message.buffer.byteLength < 1)) ||
      (message.mode === "shared" &&
        (!(message.shared instanceof SharedArrayBuffer) || message.shared.byteLength < 4))
    ) {
      parentPort!.postMessage({
        id: typeof message?.id === "string" ? message.id : null,
        ok: false,
        error: "Invalid worker message",
      })
      return
    }
    if (message.mode === "silent") return
    let result = 0
    if (message.mode === "sum") for (let value = 1; value <= 50000; value++) result += value
    if (message.mode === "transfer" && message.buffer instanceof ArrayBuffer)
      result = new Uint8Array(message.buffer)[0]
    if (message.mode === "shared" && message.shared instanceof SharedArrayBuffer)
      result = Atomics.add(new Int32Array(message.shared, 0, 1), 0, 1) + 1
    parentPort!.postMessage({ id: message.id, ok: true, result, threadId })
  }
)
