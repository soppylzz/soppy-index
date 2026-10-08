/* global document, window */
const origin = document.body.dataset.parent
const role = new URL(window.location.href).searchParams.get("role")
const id = crypto.randomUUID().slice(0, 8)
const list = document.querySelector("#log")
let controller
function log(message) {
  const line = document.createElement("li")
  line.textContent = `${new Date().toISOString()} [${id}] ${message}`
  list.append(line)
  while (list.children.length > 40) list.firstElementChild.remove()
}
function ready() {
  window.parent.postMessage({ kind: "ready", role }, origin)
}
function connect() {
  controller?.abort()
  controller = new AbortController()
  window.addEventListener(
    "message",
    (event) => {
      if (event.origin !== origin || event.source !== window.parent) {
        log("拒绝父窗口 origin/source")
        return
      }
      const data = event.data
      if (data?.kind === "hello") {
        ready()
        return
      }
      if (
        !data ||
        typeof data !== "object" ||
        data.kind !== "probe" ||
        typeof data.id !== "string" ||
        data.id.length > 100
      ) {
        log("拒绝 probe 结构")
        return
      }
      log(`接收并处理 probe id=${data.id}`)
      window.parent.postMessage({ kind: "ack", role, id: data.id, ok: true }, origin)
    },
    { signal: controller.signal }
  )
  document
    .querySelector("#inside")
    .addEventListener(
      "click",
      (event) => log(`子文档 click trusted=${event.isTrusted}；不会向父文档 DOM 冒泡`),
      { signal: controller.signal }
    )
  ready()
}
window.addEventListener("pagehide", () => controller?.abort())
window.addEventListener("pageshow", (event) => {
  if (event.persisted) connect()
})
connect()
