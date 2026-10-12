/* global document, window */
const identity = crypto.randomUUID().slice(0, 8)
const log = globalThis.Demo.createLogger("#log", { context: identity, console: true })
document.querySelector("#identity").textContent = `上下文 ${identity} · ${window.location.origin}`
const pending = new Set()
function cancel() {
  for (const controller of pending) controller.abort()
  pending.clear()
  document.querySelector("#status").textContent = "在途操作已取消"
  log("清理在途请求")
}
async function run(mode) {
  const controller = new AbortController()
  pending.add(controller)
  const id = crypto.randomUUID()
  let timer
  document.querySelector("#status").textContent = `请求中：${mode}`
  log(`发起 ${mode} id=${id}；此时尚无接收或处理证明`)
  try {
    if (mode === "cancel") timer = setTimeout(() => controller.abort(), 50)
    const body =
      mode === "valid"
        ? { id, text: "合法消息" }
        : mode === "invalid"
          ? { id, text: 42 }
          : { id, text: "x".repeat(600) }
    const response = await fetch(
      mode === "cancel" ? "/slow" : mode === "stream" ? "/stream" : "/echo",
      mode === "cancel" || mode === "stream"
        ? { signal: controller.signal }
        : {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          }
    )
    log(`HTTP 响应 ${response.status}；尚需解析业务结果`)
    if (mode === "stream") {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let bytes = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          bytes += value.byteLength
          log(`实际响应分块 ${value.byteLength} bytes: ${decoder.decode(value, { stream: true })}`)
        }
        log(`读取完成，共 ${bytes} bytes；网络块边界不保证等于服务 write 边界`)
      } finally {
        reader.releaseLock()
      }
    } else {
      const result = await response.json()
      if (response.ok && result.id === id && result.accepted === true) log(`业务确认成功 id=${id}`)
      else log(`未获得匹配业务 ack：${JSON.stringify(result)}`)
    }
  } catch (error) {
    log(`请求结束：${error.name}；取消或传输失败不说明服务端业务一定未执行`)
  } finally {
    clearTimeout(timer)
    pending.delete(controller)
    document.querySelector("#status").textContent = `在途操作：${pending.size}`
  }
}
for (const mode of ["valid", "invalid", "large", "cancel", "stream"])
  document.querySelector(`#${mode}`).addEventListener("click", () => run(mode))
document.querySelector("#disconnect").addEventListener("click", cancel)
window.addEventListener("pagehide", cancel)
