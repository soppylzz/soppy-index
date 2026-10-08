/* global document */
export const identity = globalThis.crypto.randomUUID().slice(0, 8)
let logger
export function log(message) {
  logger ??= globalThis.Demo.createLogger("#log", { context: identity, limit: 120, console: true })
  logger(message)
}
export function envelope(scope, op) {
  return { v: 1, type: "request", id: globalThis.crypto.randomUUID(), sender: identity, scope, op }
}
export function valid(data) {
  return (
    data !== null &&
    typeof data === "object" &&
    data.v === 1 &&
    typeof data.id === "string" &&
    /^[\da-f-]{36}$/i.test(data.id) &&
    typeof data.sender === "string" &&
    data.sender.length <= 64 &&
    ["bc", "storage", "worker", "window", "port"].includes(data.scope) &&
    (data.type === "request"
      ? ["ping", "fail", "silent", "connect"].includes(data.op)
      : data.type === "ack" &&
        ["ok", "error"].includes(data.status) &&
        typeof data.result === "string" &&
        data.result.length <= 200)
  )
}
export function ack(request, result, status = "ok") {
  return {
    v: 1,
    type: "ack",
    id: request.id,
    sender: identity,
    scope: request.scope,
    status,
    result,
  }
}
export function describe() {
  document.querySelector("#identity").textContent =
    `上下文 ${identity} | ${globalThis.location.origin}`
}
