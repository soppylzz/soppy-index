import { createSocket } from "node:dgram"
import { once } from "node:events"
import { createServer, connect } from "node:net"
import { log, runLab } from "../../node/lab.ts"

function frame(message: string): Buffer {
  const body = Buffer.from(message)
  const header = Buffer.alloc(2)
  header.writeUInt16BE(body.length)
  return Buffer.concat([header, body])
}

async function observeTcp(): Promise<void> {
  let resolveMessages!: () => void
  const messages = new Promise<void>((resolve) => {
    resolveMessages = resolve
  })
  let received = 0
  const server = createServer((socket) => {
    let pending = Buffer.alloc(0)
    socket.on("data", (chunk) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
      log("tcp-data-event", { bytes: bytes.length })
      pending = Buffer.concat([pending, bytes])
      while (pending.length >= 2) {
        const length = pending.readUInt16BE(0)
        if (pending.length < length + 2) break
        const message = pending.subarray(2, length + 2).toString()
        pending = pending.subarray(length + 2)
        log("tcp-app-message", { message })
        received += 1
        if (received === 2) {
          socket.end()
          resolveMessages()
        }
      }
    })
  })
  try {
    server.listen(0, "127.0.0.1")
    await once(server, "listening")
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("TCP address unavailable")
    log("tcp-listening", { host: "127.0.0.1", port: address.port })
    const client = connect(address.port, "127.0.0.1")
    try {
      await once(client, "connect")
      client.write(Buffer.concat([frame("alpha"), frame("beta")]))
      log("tcp-client-write", { appMessages: 2 })
      await withTimeout(messages, 5000)
    } finally {
      client.destroy()
    }
  } finally {
    server.close()
    await once(server, "close")
  }
}

async function observeUdp(): Promise<void> {
  const server = createSocket("udp4")
  const client = createSocket("udp4")
  let received = 0
  let resolveMessages!: () => void
  const messages = new Promise<void>((resolve) => {
    resolveMessages = resolve
  })
  server.on("message", (datagram) => {
    log("udp-datagram", { message: datagram.toString(), bytes: datagram.length })
    received += 1
    if (received === 2) resolveMessages()
  })
  try {
    server.bind(0, "127.0.0.1")
    await once(server, "listening")
    const address = server.address()
    log("udp-listening", { host: "127.0.0.1", port: address.port })
    await new Promise<void>((resolve, reject) =>
      client.send("alpha", address.port, "127.0.0.1", (error) =>
        error ? reject(error) : resolve()
      )
    )
    await new Promise<void>((resolve, reject) =>
      client.send("beta", address.port, "127.0.0.1", (error) => (error ? reject(error) : resolve()))
    )
    await withTimeout(messages, 5000)
  } finally {
    server.close()
    client.close()
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Network lab timed out")), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

await runLab("tcp-udp-message-boundaries", async () => {
  log("lab-guide", {
    run: "node docs/network/lab/index.ts",
    observe: "Compare TCP data events with parsed messages and UDP datagrams.",
    capture: "Capture loopback traffic using the logged ports; stop with Ctrl+C if needed.",
  })
  await observeTcp()
  await observeUdp()
})
