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
function log(message) {
  const line = document.createElement("li")
  line.textContent = `${new Date().toISOString()} [${id}] ${message}`
  logList.append(line)
  while (logList.children.length > 120) logList.firstElementChild.remove()
}
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
function initialize() {
  if (mode === "tree") tree()
  else if (mode === "layout") layout()
  else events()
}
function tree() {
  const list = document.querySelector("#list")
  const fixed = list.querySelectorAll(".item")
  const live = list.getElementsByClassName("item")
  const input = document.querySelector("#value")
  function collections() {
    log(
      `集合 static=${fixed.length} live=${live.length} fresh=${list.querySelectorAll(".item").length}`
    )
  }
  function values() {
    log(
      `表单 attribute=${input.getAttribute("value")} defaultValue=${input.defaultValue} property=${input.value}`
    )
  }
  on("#append", "click", () => {
    const fragment = document.createDocumentFragment()
    fragment.append(document.querySelector("#template").content.cloneNode(true))
    const node = fragment.firstElementChild
    list.append(fragment)
    log(
      `fragment 插入后 children=${fragment.childNodes.length}；节点已移动 parent=${node.parentNode.id}`
    )
    collections()
  })
  on("#collections", "click", collections)
  on("#property", "click", () => {
    input.value = "当前 property"
    values()
  })
  on("#attribute", "click", () => {
    input.setAttribute("value", "新的默认值")
    values()
  })
  on("#values", "click", values)
  on("#reset", "click", () => {
    input.form.reset()
    values()
  })
  on("#value", "input", () => {
    log("真实 input 事件")
    values()
  })
  const content = document.querySelector("#content")
  on("#text", "click", () => {
    content.textContent = document.querySelector("#markup").value
    log(`textContent 写入后 b 元素=${Boolean(content.querySelector("b"))}`)
  })
  on("#html", "click", () => {
    content.innerHTML = "<b>固定可信标记</b><span hidden>隐藏文本</span>"
    log("固定 HTML 已解析；未解析输入框里的用户字符串")
  })
  on("#texts", "click", () =>
    log(
      `文本 textContent=${JSON.stringify(content.textContent)} innerText=${JSON.stringify(content.innerText)} innerHTML=${JSON.stringify(content.innerHTML)}`
    )
  )
  collections()
  values()
}
function layout() {
  const box = document.querySelector("#box")
  function metrics() {
    const rect = box.getBoundingClientRect()
    log(
      `盒尺寸 offsetWidth=${box.offsetWidth} clientWidth=${box.clientWidth} scrollWidth=${box.scrollWidth} rectWidth=${rect.width.toFixed(1)} x=${rect.x.toFixed(1)} viewportScrollY=${window.scrollY}`
    )
  }
  on("#metrics", "click", metrics)
  on("#transform", "click", () => {
    box.style.transform = box.style.transform ? "" : "scale(1.2)"
    metrics()
  })
  on("#style", "click", () =>
    log(
      `样式 inline.width=${box.style.width || "空"} computed.width=${window.getComputedStyle(box).width}；computed 是解析后的值，读取可能需要样式或布局更新`
    )
  )
  function benchmark(batch) {
    const root = document.querySelector("#bench")
    const nodes = Array.from({ length: 200 }, () => document.createElement("div"))
    root.replaceChildren(...nodes)
    const initial = root.offsetHeight
    const start = performance.now()
    if (batch) {
      const widths = nodes.map((node) => node.offsetWidth)
      nodes.forEach((node, index) => {
        node.style.width = `${widths[index] + 1}px`
      })
    } else for (const node of nodes) node.style.width = `${node.offsetWidth + 1}px`
    const final = nodes[nodes.length - 1].offsetWidth
    const duration = performance.now() - start
    log(
      `真实布局读写 mode=${batch ? "batch" : "interleave"} nodes=200 beforeHeight=${initial} finalWidth=${final} elapsed=${duration.toFixed(2)}ms；不能推导固定性能倍数`
    )
    root.replaceChildren()
  }
  on("#interleave", "click", () => benchmark(false))
  on("#batch", "click", () => benchmark(true))
  metrics()
}
function events() {
  const target = document.querySelector("#target")
  const signal = controller.signal
  const phases = ["NONE", "CAPTURE", "TARGET", "BUBBLE"]
  function record(label, event) {
    log(
      `事件 ${label} phase=${phases[event.eventPhase]} target=${event.target.id} currentTarget=${event.currentTarget.id} trusted=${event.isTrusted} cancelable=${event.cancelable} defaultPrevented=${event.defaultPrevented}`
    )
  }
  for (const name of ["outer", "inner", "target"]) {
    const node = document.querySelector(`#${name}`)
    node.addEventListener("click", (event) => record(`${name}:capture`, event), {
      capture: true,
      signal,
    })
    if (name !== "target")
      node.addEventListener("click", (event) => record(`${name}:bubble`, event), { signal })
  }
  target.addEventListener(
    "click",
    (event) => {
      const propagation = document.querySelector("#propagation").value
      if (document.querySelector("#prevent").checked) event.preventDefault()
      record("target:A", event)
      if (propagation === "stop") event.stopPropagation()
      if (propagation === "immediate") event.stopImmediatePropagation()
    },
    { signal, passive: document.querySelector("#passive").checked }
  )
  target.addEventListener("click", (event) => record("target:B", event), { signal })
  on("#passive", "change", connect)
  on("#dispatch", "click", () => {
    const event = new window.MouseEvent("click", { bubbles: true, cancelable: true })
    log("dispatchEvent 开始（脚本创建，非可信输入）")
    const result = target.dispatchEvent(event)
    log(
      `dispatchEvent 返回 result=${result} defaultPrevented=${event.defaultPrevented} currentTarget=${event.currentTarget}`
    )
  })
  on("#once", "click", () => {
    target.addEventListener("lab-once", (event) => log(`once 回调 trusted=${event.isTrusted}`), {
      once: true,
      signal,
    })
    target.dispatchEvent(new window.Event("lab-once"))
    target.dispatchEvent(new window.Event("lab-once"))
    log("两次脚本事件派发完成")
  })
  on("#link", "click", (event) => {
    if (document.querySelector("#prevent").checked) event.preventDefault()
    record("link", event)
  })
  let count = document.querySelectorAll("#delegation button").length
  on("#add", "click", () => {
    const button = document.createElement("button")
    const span = document.createElement("span")
    button.dataset.id = String(++count)
    span.textContent = `委托子项 ${count}`
    button.append(span)
    document.querySelector("#delegation").append(button)
  })
  on("#delegation", "click", (event) => {
    if (!(event.target instanceof window.Element)) return
    const button = event.target.closest("button[data-id]")
    if (!button || !event.currentTarget.contains(button)) return
    log(`委托命中 id=${button.dataset.id} target=${event.target.nodeName}`)
  })
  for (const type of ["focus", "focusin"]) {
    document
      .querySelector("#focus")
      .addEventListener(type, (event) => log(`焦点 target ${type} bubbles=${event.bubbles}`), {
        signal,
      })
    document
      .querySelector("#focus")
      .parentElement.addEventListener(
        type,
        (event) => log(`焦点 parent bubble-listener ${type} target=${event.target.id}`),
        { signal }
      )
  }
}
connect()
