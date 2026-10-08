/* global document, window, parent */
import { identity, log, valid, ack, describe } from "./common.js"
const parentOrigin = document.body.dataset.parent
let port
function closePort() {
  if (port) {
    port.onmessage = null
    port.onmessageerror = null
    port.close()
    port = null
  }
  document.querySelector("#status").textContent = "端口未连接"
}
function handlePort(event) {
  const data = event.data
  if (data?.type === "close") {
    closePort()
    log("收到应用关闭通知，已清理端口")
    return
  }
  if (!valid(data) || data.type !== "request" || data.scope !== "port") {
    log("拒绝 port schema")
    return
  }
  log(`接收 port id=${data.id} op=${data.op}`)
  if (data.op === "silent") {
    log("已接收，实验选择不处理、不 ack")
    return
  }
  if (data.op === "fail") {
    log("业务处理失败，回传 error ack")
    port.postMessage(ack(data, "实验业务拒绝", "error"))
    return
  }
  if (!(data.buffer instanceof ArrayBuffer)) {
    log("拒绝 port buffer schema")
    return
  }
  log(
    `业务读取 buffer.byteLength=${data.buffer.byteLength} first=${new Uint8Array(data.buffer)[0]}`
  )
  port.postMessage(ack(data, `已处理 ${data.buffer.byteLength} 字节`))
}
function onMessage(event) {
  if (event.origin !== parentOrigin) {
    log(`拒绝 window origin=${event.origin}`)
    event.ports.forEach((item) => item.close())
    return
  }
  if (event.source !== parent) {
    log("拒绝 window source")
    event.ports.forEach((item) => item.close())
    return
  }
  const data = event.data
  if (
    !valid(data) ||
    data.type !== "request" ||
    data.scope !== "window" ||
    (data.op === "connect" ? event.ports.length !== 1 : event.ports.length !== 0)
  ) {
    log("拒绝 window schema")
    event.ports.forEach((item) => item.close())
    return
  }
  log(`接收 window from=${data.sender} id=${data.id}`)
  if (data.op === "connect") {
    closePort()
    port = event.ports[0]
    port.onmessage = handlePort
    port.onmessageerror = () => log("port messageerror")
    port.start()
    port.postMessage({ v: 1, type: "port-ready", sender: identity })
    document.querySelector("#status").textContent = "端口已连接"
  }
  log("业务处理 window 完成；回传 ack")
  parent.postMessage(ack(data, data.op === "connect" ? "端口已接收" : "请求已处理"), parentOrigin)
}
function cleanup() {
  closePort()
  window.removeEventListener("message", onMessage)
}
function start() {
  window.addEventListener("message", onMessage)
  if (!new URLSearchParams(globalThis.location.search).has("role")) {
    parent.postMessage({ v: 1, type: "ready", sender: identity }, parentOrigin)
  }
}
window.addEventListener("pagehide", cleanup)
window.addEventListener("pageshow", (event) => {
  if (event.persisted) start()
})
describe()
closePort()
start()
