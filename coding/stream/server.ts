import { createServer } from "node:http"
import { once } from "node:events"
import next from "next"
import { attachWebSocket } from "./lib/ws-server.ts"

const hostname = "127.0.0.1"
const port = Number(process.env.PORT || 3100)
const wsPort = Number(process.env.WS_PORT || 3101)
if (
  ![port, wsPort].every((value) => Number.isInteger(value) && value > 0 && value < 65536) ||
  port === wsPort
) {
  throw new Error("PORT and WS_PORT must be distinct valid ports")
}
const app = next({
  dev: process.env.NODE_ENV !== "production",
  dir: import.meta.dirname,
  hostname,
  port,
})
await app.prepare()
const http = createServer(app.getRequestHandler())
const websocket = createServer((_request, response) => {
  response.writeHead(404).end("Use the WebSocket endpoint /ws")
})
const sockets = attachWebSocket(websocket, `http://${hostname}:${port}`)

async function shutdown() {
  for (const socket of sockets.clients) socket.terminate()
  sockets.close()
  http.closeAllConnections()
  http.close()
  websocket.close()
  await app.close()
}

try {
  http.listen(port, hostname)
  await once(http, "listening")
  websocket.listen(wsPort, hostname)
  await once(websocket, "listening")
  console.log(`Stream demo: http://${hostname}:${port}`)
  console.log(`WebSocket: ws://${hostname}:${wsPort}/ws`)
} catch (error) {
  console.error("Unable to start stream demo:", (error as Error).message)
  await shutdown()
  process.exit(1)
}
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdown().then(() => process.exit(0))
  })
}
