import { ack, valid } from "./common.js"
const instance = globalThis.crypto.randomUUID().slice(0, 8)
const clients = new Map()
let count = 0
let sweep
function remove(port) {
  port.onmessage = null
  port.onmessageerror = null
  port.close()
  clients.delete(port)
  if (clients.size === 0) {
    clearInterval(sweep)
    sweep = null
  }
}
globalThis.onconnect = (event) => {
  const port = event.ports[0]
  if (clients.size >= 30) {
    port.close()
    return
  }
  clients.set(port, Date.now())
  if (!sweep)
    sweep = setInterval(() => {
      for (const [client, seen] of clients) if (Date.now() - seen > 15000) remove(client)
    }, 3000)
  port.onmessage = (event) => {
    clients.set(port, Date.now())
    const data = event.data
    if (data?.type === "bye") {
      remove(port)
      return
    }
    if (data?.type === "heartbeat") return
    if (!valid(data) || data.type !== "request" || data.scope !== "worker") return
    if (data.op === "ping") count++
    port.postMessage(ack(data, `instance=${instance} count=${count} leases=${clients.size}`))
  }
  port.onmessageerror = () => remove(port)
  port.start()
}
