/* global document, window, MutationObserver, IntersectionObserver, ResizeObserver, requestAnimationFrame, cancelAnimationFrame */
const mode = document.body.dataset.mode
const target = document.querySelector("#target")
const logList = document.querySelector("#log")
const contextId = crypto.randomUUID().slice(0, 8)
document.querySelector("#identity").textContent =
  `上下文 ${contextId} · ${window.location.origin} · ${mode}`
let observers = []
let controller
let connected = false
let resumeOnRestore = false
let frame = 0
let generation = 0
let count = 0
let feedback = ""
let writes = 0
const log = globalThis.Demo.createLogger(logList, { context: contextId, limit: 100 })
function status(message) {
  document.querySelector("#status").textContent = message
}
function mutationRecords(records, delivery) {
  log(`${delivery} records=${records.length}`)
  for (const record of records) {
    log(
      `记录 type=${record.type} target=${record.target.nodeName} attribute=${record.attributeName} oldValue=${JSON.stringify(record.oldValue)} added=${record.addedNodes.length} removed=${record.removedNodes.length}`
    )
  }
}
function stop(reason) {
  generation++
  for (const observer of observers) observer.disconnect()
  observers = []
  controller?.abort()
  cancelAnimationFrame(frame)
  frame = 0
  feedback = ""
  connected = false
  status(`已断开：${reason}；observer=0，待执行帧=0`)
  log(`清理 ${reason}`)
}
function connect() {
  stop("重连前清理")
  controller = new AbortController()
  const token = generation
  const active = () => connected && token === generation
  try {
    if (mode === "mutation") {
      if (!("MutationObserver" in window)) throw new Error("浏览器不支持 MutationObserver")
      const observer = new MutationObserver((records) => {
        if (active()) mutationRecords(records, "回调 MutationObserver")
      })
      observers.push(observer)
      observer.observe(target, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["data-count"],
        attributeOldValue: true,
        characterData: true,
        characterDataOldValue: true,
      })
    } else if (mode === "intersection") {
      if (!("IntersectionObserver" in window)) throw new Error("浏览器不支持 IntersectionObserver")
      for (const margin of [0, 80]) {
        const observer = new IntersectionObserver(
          (entries) => {
            if (!active()) return
            for (const entry of entries) {
              log(
                `回调 IntersectionObserver margin=${margin} isIntersecting=${entry.isIntersecting} ratio=${entry.intersectionRatio.toFixed(3)} sampleTime=${entry.time.toFixed(1)}ms rootHeight=${entry.rootBounds?.height}`
              )
            }
          },
          {
            root: document.querySelector("#root"),
            rootMargin: `${margin}px`,
            threshold: [0, 0.5, 1],
          }
        )
        observers.push(observer)
        observer.observe(target)
      }
    } else {
      if (!("ResizeObserver" in window)) throw new Error("浏览器不支持 ResizeObserver")
      window.addEventListener(
        "error",
        (event) => {
          if (event.message.includes("ResizeObserver")) log(`浏览器错误：${event.message}`)
        },
        { signal: controller.signal }
      )
      for (const box of ["content-box", "border-box"]) {
        const observer = new ResizeObserver((entries) => {
          if (!active()) return
          for (const entry of entries) {
            const content = entry.contentBoxSize?.[0]
            const border = entry.borderBoxSize?.[0]
            const pixel = entry.devicePixelContentBoxSize?.[0]
            log(
              `回调 ResizeObserver box=${box} content=${content?.inlineSize ?? entry.contentRect.width} border=${border?.inlineSize ?? "不可用"} devicePixel=${pixel?.inlineSize ?? "不可用"}`
            )
          }
          if (box === "content-box" && feedback && writes < 3) {
            const apply = () => {
              frame = 0
              if (!active()) return
              writes++
              target.style.width = `${240 + writes * 20}px`
              log(`反馈写入 ${feedback} step=${writes}/3`)
            }
            if (feedback === "next-frame") frame = requestAnimationFrame(apply)
            else apply()
          }
        })
        observers.push(observer)
        observer.observe(target, { box })
      }
    }
    connected = true
    status(`已连接：${mode}；observer=${observers.length}；等待真实变化通知`)
    log("观察已注册；注册返回不等于回调交付")
  } catch (error) {
    stop("连接失败")
    status(`不可用：${error.message}`)
    log(`连接失败：${error.message}`)
  }
}
function mutate() {
  count++
  target.dataset.count = String(count)
  target.querySelector("#text").firstChild.data = `文本 ${count}`
  target.querySelector(".added")?.remove()
  const child = document.createElement("span")
  child.className = "added"
  child.textContent = ` 新节点 ${count}`
  target.append(child)
  log(`同步修改完成 count=${count}；尚未证明回调执行`)
}
document.querySelector("#connect").addEventListener("click", connect)
document.querySelector("#disconnect").addEventListener("click", () => stop("手动断开"))
if (mode === "mutation") {
  document.querySelector("#mutate").addEventListener("click", mutate)
  document.querySelector("#drain").addEventListener("click", () => {
    mutate()
    if (observers[0]) mutationRecords(observers[0].takeRecords(), "同步 takeRecords（非回调）")
    else log("未连接，无法读取记录")
  })
  document.querySelector("#discard").addEventListener("click", () => {
    mutate()
    stop("同步 disconnect 丢弃待交付记录")
  })
} else if (mode === "intersection") {
  for (const button of document.querySelectorAll("[data-scroll]")) {
    button.addEventListener("click", () => {
      document.querySelector("#root").scrollTop = Number(button.dataset.scroll)
      log(`操作 scrollTop=${button.dataset.scroll}；等待交叉采样`)
    })
  }
  document.querySelector("#cover").addEventListener("click", () => {
    const overlay = document.querySelector("#overlay")
    overlay.hidden = !overlay.hidden
    log(`视觉遮挡 hidden=${overlay.hidden}；普通交叉观察不判断遮挡`)
  })
} else {
  document.querySelector("#width").addEventListener("click", () => {
    target.style.width = target.style.width === "320px" ? "240px" : "320px"
    log(`操作 width=${target.style.width}`)
  })
  document.querySelector("#padding").addEventListener("click", () => {
    target.style.padding = target.style.padding === "24px" ? "12px" : "24px"
    log(`操作 padding=${target.style.padding}`)
  })
  document.querySelector("#transform").addEventListener("click", () => {
    target.style.transform = target.style.transform ? "" : "scale(1.1)"
    log(`操作 transform=${target.style.transform || "none"}`)
  })
  for (const [id, strategy] of [
    ["unsafe", "direct"],
    ["safe", "next-frame"],
  ]) {
    document.querySelector(`#${id}`).addEventListener("click", () => {
      target.style.width = "240px"
      writes = 0
      connect()
      if (connected) feedback = strategy
      log(`启动有限反馈 ${strategy}；最多三次尺寸写入`)
    })
  }
}
window.addEventListener("pagehide", () => {
  resumeOnRestore = connected
  stop("pagehide")
})
window.addEventListener("pageshow", (event) => {
  if (event.persisted && resumeOnRestore) connect()
})
connect()
