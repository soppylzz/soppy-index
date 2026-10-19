import type { Server } from "node:http"
import { WebSocket, WebSocketServer } from "ws"
import { generateText } from "./provider.ts"
import { parseInput, type StreamMessage } from "./protocol.ts"

export function attachWebSocket(server: Server, allowedOrigin: string) {
  const sockets = new WebSocketServer({ noServer: true, maxPayload: 16_384 })
  server.on("upgrade", (request, socket, head) => {
    if (request.url !== "/ws" || request.headers.origin !== allowedOrigin) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n")
      return
    }
    sockets.handleUpgrade(request, socket, head, (connection) => {
      sockets.emit("connection", connection)
    })
  })
  sockets.on("connection", (socket) => {
    const controller = new AbortController()
    let started = false
    const send = (message: StreamMessage) => {
      if (socket.readyState !== WebSocket.OPEN) return
      if (socket.bufferedAmount > 1_048_576) throw new Error("Client is consuming too slowly")
      socket.send(JSON.stringify(message))
    }
    socket.on("close", () => controller.abort())
    socket.on("error", () => controller.abort())
    socket.on("message", async (data, binary) => {
      if (started) {
        controller.abort()
        socket.close(1008, "One generation per connection")
        return
      }
      started = true
      try {
        if (binary) throw new Error("Expected a text JSON message")
        const input = parseInput(JSON.parse(data.toString()))
        for await (const text of generateText(input, controller.signal)) {
          controller.signal.throwIfAborted()
          send({ type: "delta", text })
        }
        send({ type: "done" })
        socket.close(1000, "Completed")
      } catch (error) {
        if (!controller.signal.aborted && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "error", message: (error as Error).message }))
          socket.close(1011, "Generation failed")
        }
        controller.abort()
      }
    })
  })
  return sockets
}
