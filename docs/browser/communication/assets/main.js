/* global document, window, SharedWorker */
import { log, envelope, valid, ack, describe } from "./common.js"

const peerOrigin = document.body.dataset.peer
const storageKey = "communication-lab-v1"
const pending = new Map()
const trusted = document.querySelector("#trusted")
let controller
let channel
let mirror
let worker
let workerTimer
let port
let portReady = false
let frameReady = false
let connected = false
let workerState = "未连接"
function status() {
  document.querySelector("#status").textContent =
    `本地监听：${connected ? "已连接" : "已关闭"} | BroadcastChannel：${channel ? "已加入（无成员探测）" : "不可用 / 已关闭"} | Worker：${workerState} | iframe：${frameReady ? "就绪" : "未就绪"} | 端口：${portReady ? "已握手" : "未连接"} | 待确认：${pending.size}`
}
function cancel(scope) {
  for (const [id, item] of pending) {
    if (scope && item.scope !== scope) continue
    clearTimeout(item.timer)
    pending.delete(id)
    log(`取消等待 ${item.scope} id=${id}`)
  }
  status()
}
function request(scope, send, op = "ping", extra = {}) {
  if (pending.size >= 30) {
    log("待确认过多，请等待或重连")
    return
  }
  const data = { ...envelope(scope, op), ...extra }
  const timer = setTimeout(() => {
    pending.delete(data.id)
    log(`超时 ${scope} id=${data.id}：未收到业务确认，不能推断对方未接收`)
    status()
  }, 1800)
  pending.set(data.id, { scope, timer })
  try {
    send(data)
    log(`发送调用返回 ${scope} id=${data.id}；尚未证明接收或处理`)
  } catch (error) {
    clearTimeout(timer)
    pending.delete(data.id)
    log(`发送失败 ${scope} ${error.name}`)
  }
  status()
}
function receive(data, scope, respond) {
  if (!valid(data) || data.scope !== scope) {
    log(`拒绝 ${scope} schema`)
    return
  }
  log(`接收 ${scope} ${data.type} from=${data.sender} id=${data.id}`)
  if (data.type === "ack") {
    const item = pending.get(data.id)
    if (!item || item.scope !== scope) {
      log(`忽略迟到 / 重复 ack ${scope}`)
      return
    }
    clearTimeout(item.timer)
    pending.delete(data.id)
    log(`业务确认 ${scope} status=${data.status} result=${data.result}`)
    if (scope === "worker") workerState = data.result
    status()
  } else if (respond) {
    log(`业务处理 ${scope}：已读取请求，回传 ack`)
    respond(ack(data, "已读取请求"))
  }
}
function closePort() {
  if (port) {
    port.postMessage({ type: "close" })
    port.onmessage = null
    port.onmessageerror = null
    port.close()
  }
  port = null
  portReady = false
  cancel("port")
}
function disconnect() {
  controller?.abort()
  channel?.close()
  mirror?.close()
  channel = mirror = null
  clearInterval(workerTimer)
  if (worker) {
    worker.port.postMessage({ type: "bye" })
    worker.port.onmessage = null
    worker.port.onmessageerror = null
    worker.onerror = null
    worker.port.close()
  }
  worker = null
  workerState = "未连接"
  closePort()
  frameReady = false
  connected = false
  cancel()
  log("已清理频道、端口、监听器和计时器；worker 离线通知为尽力而为")
}
function connect() {
  disconnect()
  controller = new AbortController()
  connected = true
  const options = { signal: controller.signal }
  window.addEventListener(
    "message",
    (event) => {
      if (event.origin !== peerOrigin) {
        log(`拒绝 window origin=${event.origin}`)
        return
      }
      if (event.source !== trusted.contentWindow) {
        log("拒绝 window source")
        return
      }
      if (
        event.data?.type === "ready" &&
        event.data.v === 1 &&
        typeof event.data.sender === "string"
      ) {
        frameReady = true
        log(`iframe 就绪 from=${event.data.sender}`)
        status()
        return
      }
      receive(event.data, "window")
    },
    options
  )
  window.addEventListener("messageerror", () => log("window messageerror"), options)
  window.addEventListener(
    "storage",
    (event) => {
      if (event.storageArea !== window.localStorage || event.key !== storageKey) return
      log(`真实 storage 事件 old=${event.oldValue} new=${event.newValue}`)
      if (event.newValue === null) return
      try {
        receive(JSON.parse(event.newValue), "storage", (data) =>
          window.localStorage.setItem(storageKey, JSON.stringify(data))
        )
      } catch (error) {
        log(`storage 解析 / 回应失败 ${error.name}`)
      }
    },
    options
  )
  try {
    channel = new BroadcastChannel("communication-lab-v1")
    channel.onmessage = (event) => receive(event.data, "bc", (data) => channel.postMessage(data))
    channel.onmessageerror = () => log("BroadcastChannel messageerror")
    updateMirror()
  } catch (error) {
    log(`BroadcastChannel 不可用 ${error.name}`)
  }
  try {
    worker = new SharedWorker("/assets/worker.js", { name: "communication-lab-v1", type: "module" })
    worker.port.onmessage = (event) => receive(event.data, "worker")
    worker.port.onmessageerror = () => log("SharedWorker messageerror")
    worker.onerror = () => {
      workerState = "错误"
      log("SharedWorker 加载 / 执行错误")
      status()
    }
    worker.port.start()
    workerTimer = setInterval(() => worker?.port.postMessage({ type: "heartbeat" }), 3000)
    request("worker", (data) => worker.port.postMessage(data), "connect")
  } catch (error) {
    workerState = "不可用"
    log(`SharedWorker 不可用 ${error.name}`)
  }
  trusted.src = `${peerOrigin}/frame`
  status()
}
function updateMirror() {
  mirror?.close()
  mirror = null
  if (channel && document.querySelector("#mirror").checked) {
    mirror = new BroadcastChannel("communication-lab-v1")
    mirror.onmessage = (event) =>
      log(`本页第二频道对象收到 ${event.data.type} id=${event.data.id}（仅观察，不 ack）`)
  }
}
function sendWindow(target = trusted, targetOrigin = peerOrigin, malformed = false) {
  if (!connected) {
    log("请先连接")
    return
  }
  request("window", (data) =>
    target.contentWindow.postMessage(malformed ? { ...data, op: 42 } : data, targetOrigin)
  )
}
function sendPort(op = "ping") {
  if (!portReady) {
    log("请先建立端口并等待握手")
    return
  }
  if (op !== "ping") {
    request("port", (data) => port.postMessage(data), op)
    return
  }
  const buffer = new ArrayBuffer(8)
  new Uint8Array(buffer)[0] = 42
  request(
    "port",
    (data) => {
      port.postMessage(data, [buffer])
      log(`转移后发送端 buffer.byteLength=${buffer.byteLength}`)
    },
    op,
    { buffer }
  )
}
const actions = {
  open: () => window.open(window.location.href, "_blank", "noopener"),
  connect,
  disconnect,
  bc: () => (channel ? request("bc", (data) => channel.postMessage(data)) : log("请先连接频道")),
  clone: () => {
    if (!channel) {
      log("请先连接频道")
      return
    }
    try {
      channel.postMessage(() => {})
    } catch (error) {
      log(`结构化克隆失败 ${error.name}`)
    }
  },
  storage: () =>
    connected
      ? request("storage", (data) => window.localStorage.setItem(storageKey, JSON.stringify(data)))
      : log("请先连接"),
  same: () => {
    const value = window.localStorage.getItem(storageKey)
    if (value === null) {
      log("请先写入请求")
      return
    }
    window.localStorage.setItem(storageKey, value)
    log("重复 setItem 相同值：此调用不会产生 storage 事件")
  },
  remove: () => {
    window.localStorage.removeItem(storageKey)
    log("删除实验 key；其他窗口可观察 newValue=null")
  },
  worker: () =>
    worker ? request("worker", (data) => worker.port.postMessage(data)) : log("请先连接 worker"),
  window: () => sendWindow(),
  "bad-schema": () => sendWindow(trusted, peerOrigin, true),
  "bad-origin": () => sendWindow(document.querySelector("#origin-probe"), window.location.origin),
  "bad-source": () => sendWindow(document.querySelector("#source-probe")),
  "bad-target": () => sendWindow(trusted, window.location.origin),
  channel: () => {
    if (!connected || !frameReady) {
      log("请先等待 iframe 就绪")
      return
    }
    closePort()
    const pair = new MessageChannel()
    port = pair.port1
    port.onmessage = (event) => {
      if (
        event.data?.type === "port-ready" &&
        event.data.v === 1 &&
        typeof event.data.sender === "string"
      ) {
        portReady = true
        log(`端口握手完成 from=${event.data.sender}`)
        status()
        return
      }
      receive(event.data, "port")
    }
    port.onmessageerror = () => log("MessagePort messageerror")
    port.start()
    request(
      "window",
      (data) => trusted.contentWindow.postMessage(data, peerOrigin, [pair.port2]),
      "connect"
    )
    log("port2 已转交 iframe；旧持有者不得再使用它")
  },
  port: () => sendPort(),
  fail: () => sendPort("fail"),
  silent: () => sendPort("silent"),
  "close-port": () => {
    closePort()
    log("本端 port.close()；对端不会得到通用可靠的关闭通知")
  },
  "reload-frame": () => {
    closePort()
    cancel("window")
    frameReady = false
    trusted.src = `${peerOrigin}/frame`
    status()
  },
}
for (const [id, action] of Object.entries(actions)) {
  document.getElementById(id).addEventListener("click", () => {
    try {
      action()
    } catch (error) {
      log(`操作失败 ${error.name}: ${error.message}`)
    }
  })
}
document.querySelector("#mirror").addEventListener("change", updateMirror)
window.addEventListener("pagehide", disconnect)
window.addEventListener("pageshow", (event) => {
  if (event.persisted) connect()
})
describe()
connect()
