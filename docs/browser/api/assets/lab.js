/* global document, window */
const mode = document.body.dataset.mode
const id = crypto.randomUUID().slice(0, 8)
const logList = document.querySelector("#log")
const statusNode = document.querySelector("#status")
document.querySelector("#identity").textContent =
  `上下文 ${id} · ${window.location.origin} · ${mode}`
let controller
let cleanup = () => {}
let connected = false
let restore = false
const log = globalThis.Demo.createLogger(logList, { context: id, limit: 120 })
function on(selector, type, handler, options = {}) {
  document
    .querySelector(selector)
    .addEventListener(type, handler, { ...options, signal: controller.signal })
}
function stop(reason) {
  connected = false
  cleanup()
  cleanup = () => {}
  controller?.abort()
  statusNode.textContent = `已断开：${reason}`
  log(`清理 ${reason}`)
}
function connect() {
  stop("重连前清理")
  controller = new AbortController()
  connected = true
  try {
    initialize()
    statusNode.textContent = `已连接：${mode}`
    log("实验监听已注册")
  } catch (error) {
    stop("初始化失败")
    statusNode.textContent = `不可用：${error.message}`
    log(`初始化失败 ${error.name}：${error.message}`)
  }
}
document.querySelector("#connect").addEventListener("click", connect)
document.querySelector("#disconnect").addEventListener("click", () => stop("手动断开"))
window.addEventListener("pagehide", (event) => {
  restore = connected
  log(`生命周期 pagehide persisted=${event.persisted}`)
  stop("pagehide")
})
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    log("生命周期 pageshow persisted=true")
    if (restore) connect()
  }
})
let component
function initialize() {
  if (mode === "tools") tools()
  else if (mode === "files") files()
  else if (mode === "components") components()
  else frames()
}
function tools() {
  if (!("structuredClone" in window)) throw new Error("浏览器不支持 structuredClone")
  let request
  let timer
  const signal = controller.signal
  cleanup = () => {
    request?.abort()
    clearTimeout(timer)
  }
  on("#url", "click", () => {
    const url = new URL("/api/delay", window.location.href)
    url.searchParams.set("q", "空格 & 中文")
    url.searchParams.append("tag", "a")
    url.searchParams.append("tag", "b")
    log(
      `URL ${url.href}；q=${url.searchParams.get("q")}；tags=${url.searchParams.getAll("tag").join(",")}`
    )
  })
  on("#clone", "click", () => {
    const original = { date: new Date("2026-01-01"), map: new Map([["x", 1]]) }
    original.self = original
    const copy = structuredClone(original)
    const buffer = new ArrayBuffer(8)
    new Uint8Array(buffer)[0] = 42
    const moved = structuredClone({ buffer }, { transfer: [buffer] })
    log(
      `克隆 self=${copy.self === copy} Date=${copy.date instanceof Date} Map=${copy.map.get("x")}；转移 sourceBytes=${buffer.byteLength} targetBytes=${moved.buffer.byteLength} first=${new Uint8Array(moved.buffer)[0]}`
    )
  })
  on("#clone-error", "click", () => {
    try {
      structuredClone(() => {})
    } catch (error) {
      log(`克隆拒绝 ${error.name}`)
    }
  })
  async function run(path, options = {}) {
    request?.abort()
    clearTimeout(timer)
    const current = new AbortController()
    request = current
    const requestId = crypto.randomUUID().slice(0, 8)
    timer = setTimeout(() => current.abort(), 2500)
    log(`请求发起 id=${requestId} ${path}；尚未证明响应或处理`)
    try {
      const response = await fetch(path, { ...options, signal: current.signal })
      if (signal.aborted || request !== current) return
      log(`响应到达 id=${requestId} status=${response.status} ok=${response.ok}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (!signal.aborted && request === current)
        log(`响应体已读取 id=${requestId} ${JSON.stringify(data)}；仅实验元数据确认`)
    } catch (error) {
      if (!signal.aborted) log(`请求结束 id=${requestId} ${error.name} ${error.message}`)
    } finally {
      if (request === current) {
        clearTimeout(timer)
        request = undefined
      }
    }
  }
  on("#fetch", "click", () => {
    void run("/api/delay?ms=1200")
  })
  on("#cancel", "click", () => {
    request?.abort()
    log("调用 abort；是否已经产生服务端副作用需另行判断")
  })
  on("#http-error", "click", () => {
    void run("/missing")
  })
  on("#form", "click", () => {
    const data = new FormData()
    data.append("title", "浏览器表单")
    data.append("file", new Blob(["demo"], { type: "text/plain" }), "demo.txt")
    void run("/api/inspect", { method: "POST", body: data })
  })
}
function files() {
  let blob = new Blob(["浏览器本地内容"], { type: "text/plain;charset=utf-8" })
  let objectUrl
  let reader
  const signal = controller.signal
  const link = document.querySelector("#download")
  function revoke() {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
      log("Object URL 已释放")
    }
    objectUrl = undefined
    link.hidden = true
    link.removeAttribute("href")
  }
  cleanup = () => {
    reader?.abort()
    revoke()
  }
  on("#blob", "click", async () => {
    blob = new Blob(["浏览器本地内容"], { type: "text/plain;charset=utf-8" })
    const currentBlob = blob
    const text = await currentBlob.text()
    if (!signal.aborted)
      log(`Blob.text 已读取 size=${currentBlob.size} type=${currentBlob.type} text=${text}`)
  })
  on("#file", "change", (event) => {
    const file = event.target.files[0]
    if (!file) return
    if (file.size > 65536) {
      log("文件拒绝：超过 64 KiB")
      return
    }
    reader?.abort()
    blob = file
    const currentReader = new window.FileReader()
    reader = currentReader
    currentReader.addEventListener(
      "load",
      () =>
        log(
          `FileReader load name=${file.name} size=${file.size} text=${String(currentReader.result).slice(0, 120)}`
        ),
      { signal }
    )
    currentReader.addEventListener(
      "error",
      () => log(`FileReader error ${currentReader.error?.name}`),
      {
        signal,
      }
    )
    currentReader.addEventListener("abort", () => log("FileReader abort"), { signal })
    currentReader.readAsText(file)
  })
  on("#object-url", "click", async () => {
    revoke()
    const currentBlob = blob
    objectUrl = URL.createObjectURL(currentBlob)
    const current = objectUrl
    link.href = current
    link.hidden = false
    try {
      const text = await (await fetch(current, { signal })).text()
      if (!signal.aborted && objectUrl === current)
        log(`Object URL 已读取 size=${currentBlob.size} text=${text.slice(0, 120)}`)
    } catch (error) {
      if (!signal.aborted) log(`Object URL 读取失败 ${error.name}`)
    }
  })
  on("#revoke", "click", revoke)
  const query = window.matchMedia("(max-width: 700px)")
  function environment() {
    log(
      `环境 secure=${window.isSecureContext} onLine=${window.navigator.onLine} media=${query.matches}；不代表目标服务可达`
    )
  }
  query.addEventListener("change", (event) => log(`matchMedia change matches=${event.matches}`), {
    signal,
  })
  window.addEventListener("online", environment, { signal })
  window.addEventListener("offline", environment, { signal })
  on("#environment", "click", environment)
  environment()
}
function components() {
  if (!("customElements" in window) || !("attachShadow" in window.Element.prototype))
    throw new Error("浏览器不支持本实验的 Web Components")
  if (!window.customElements.get("lab-counter")) {
    const template = document.createElement("template")
    template.innerHTML = `<style>:host{display:block;padding:16px;border:1px solid var(--counter-color,#555)}button{color:var(--counter-color,#555)}</style><slot></slot><button part="button">内部计数 <span id="value"></span></button>`
    window.customElements.define(
      "lab-counter",
      class extends window.HTMLElement {
        static observedAttributes = ["value"]
        composedEvents = true
        connection
        constructor() {
          super()
          this.attachShadow({ mode: "open" }).append(template.content.cloneNode(true))
          log("组件 constructor")
        }
        connectedCallback() {
          this.connection?.abort()
          this.connection = new AbortController()
          const signal = this.connection.signal
          const internalButton = this.shadowRoot.querySelector("button")
          internalButton.addEventListener(
            "click",
            () => {
              const value = Number(this.getAttribute("value") ?? 0) + 1
              this.setAttribute("value", String(value))
              internalButton.dispatchEvent(
                new window.CustomEvent("demo-change", {
                  detail: { value },
                  bubbles: true,
                  composed: this.composedEvents,
                })
              )
            },
            { signal }
          )
          this.shadowRoot
            .querySelector("slot")
            .addEventListener(
              "slotchange",
              () =>
                log(
                  `slotchange assigned=${this.shadowRoot.querySelector("slot").assignedElements().length}`
                ),
              { signal }
            )
          this.render()
          log("组件 connectedCallback")
        }
        disconnectedCallback() {
          this.connection?.abort()
          log("组件 disconnectedCallback；内部监听已清理")
        }
        attributeChangedCallback(name, oldValue, newValue) {
          this.render()
          log(`组件 attributeChangedCallback ${name} ${oldValue} -> ${newValue}`)
        }
        render() {
          this.shadowRoot.querySelector("#value").textContent = this.getAttribute("value") ?? "0"
        }
      }
    )
  }
  const mount = document.querySelector("#mount-point")
  if (!component) {
    component = document.createElement("lab-counter")
    const title = document.createElement("span")
    title.textContent = "外部 slot 内容"
    component.append(title)
    component.setAttribute("value", "0")
  }
  component.composedEvents = document.querySelector("#composed").checked
  mount.addEventListener(
    "demo-change",
    (event) => {
      log(
        `外部 demo-change target=${event.target.localName} currentTarget=${event.currentTarget.id} value=${event.detail.value} path=${event
          .composedPath()
          .map((node) => node.nodeName ?? "Window")
          .join(">")}`
      )
    },
    { signal: controller.signal }
  )
  component.shadowRoot.addEventListener(
    "demo-change",
    (event) => log(`内部 demo-change composed=${event.composed} value=${event.detail.value}`),
    { signal: controller.signal }
  )
  cleanup = () => component.remove()
  mount.append(component)
  on("#mount", "click", () => {
    if (component.isConnected) component.remove()
    else mount.append(component)
  })
  on("#attribute", "click", () =>
    component.setAttribute("value", String(Number(component.getAttribute("value")) + 10))
  )
  on("#slot", "click", () => {
    const child = document.createElement("span")
    child.textContent = "更新的外部节点"
    component.replaceChildren(child)
    log(`slot 所有权 child.parentNode===host：${child.parentNode === component}`)
  })
  on("#composed", "change", (event) => {
    component.composedEvents = event.target.checked
  })
  on("#inspect", "click", () =>
    log(
      `open shadowRoot=${Boolean(component.shadowRoot)}；外部 querySelector 内部按钮=${Boolean(component.querySelector("button"))}；slot 节点父级=${component.firstElementChild.parentNode.localName}`
    )
  )
}
function frames() {
  const parentOrigin = window.location.origin
  const peerOrigin = document.body.dataset.peer
  const same = document.querySelector("#same")
  const cross = document.querySelector("#cross")
  const opaque = document.querySelector("#opaque")
  const pending = new Map()
  let crossReady = false
  function clearPending() {
    for (const timer of pending.values()) clearTimeout(timer)
    pending.clear()
  }
  cleanup = clearPending
  window.addEventListener(
    "message",
    (event) => {
      const source =
        event.source === same.contentWindow
          ? "same"
          : event.source === cross.contentWindow
            ? "cross"
            : event.source === opaque.contentWindow
              ? "opaque"
              : "unknown"
      const expected =
        source === "same" ? parentOrigin : source === "cross" ? peerOrigin : undefined
      if (!expected || event.origin !== expected) {
        log(`拒绝 iframe origin/source：origin=${event.origin} source=${source}`)
        return
      }
      const data = event.data
      if (
        !data ||
        typeof data !== "object" ||
        !["ready", "ack"].includes(data.kind) ||
        data.role !== source ||
        (data.kind === "ack" && (typeof data.id !== "string" || data.ok !== true))
      ) {
        log("拒绝 iframe 消息结构")
        return
      }
      if (data.kind === "ready") {
        if (source === "cross") crossReady = true
        log(`脚本就绪 source=${source} origin=${event.origin}`)
      } else if (source === "cross" && pending.has(data.id)) {
        clearTimeout(pending.get(data.id))
        pending.delete(data.id)
        log(`业务 ack id=${data.id} ok=true；接收方已校验并处理 probe`)
      } else log("拒绝过期或不匹配 ack")
    },
    { signal: controller.signal }
  )
  for (const frame of [same, cross, opaque])
    frame.addEventListener(
      "load",
      () => {
        if (frame === cross) {
          crossReady = false
          clearPending()
        }
        log(`iframe load id=${frame.id}；不等于脚本就绪`)
        if (frame !== opaque)
          frame.contentWindow.postMessage(
            { kind: "hello" },
            frame === same ? parentOrigin : peerOrigin
          )
      },
      { signal: controller.signal }
    )
  document.addEventListener(
    "click",
    (event) => log(`父文档 click target=${event.target.id || event.target.nodeName}`),
    { signal: controller.signal }
  )
  on("#read", "click", () => {
    for (const frame of [same, cross, opaque]) {
      try {
        log(
          `DOM 读取 ${frame.id}：${frame.contentWindow.document.querySelector("#frame-label").textContent}`
        )
      } catch (error) {
        log(`DOM 读取拒绝 ${frame.id}：${error.name}`)
      }
    }
  })
  for (const [selector, valid] of [
    ["#message", true],
    ["#bad-message", false],
  ])
    on(selector, "click", () => {
      if (!crossReady) {
        log("跨源脚本尚未确认就绪，请重连或等待")
        return
      }
      const requestId = crypto.randomUUID()
      pending.set(
        requestId,
        setTimeout(() => {
          pending.delete(requestId)
          log(`超时 id=${requestId}；没有业务确认，不能推断未接收`)
        }, 1500)
      )
      cross.contentWindow.postMessage({ kind: "probe", id: valid ? requestId : 123 }, peerOrigin)
      log(`发送调用返回 id=${requestId} valid=${valid}；等待接收与业务 ack`)
    })
  on("#reload", "click", () => {
    crossReady = false
    clearPending()
    for (const frame of [same, cross, opaque]) frame.setAttribute("src", frame.getAttribute("src"))
    log("重载已发起；旧请求超时计时器已清理")
  })
  same.contentWindow.postMessage({ kind: "hello" }, parentOrigin)
  cross.contentWindow.postMessage({ kind: "hello" }, peerOrigin)
}
connect()
