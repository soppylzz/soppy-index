import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/* ==================== config ==================== */

const PORT = Number(process.env.PORT ?? 5001)
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error("PORT must be an integer from 0 to 65535")
}

/* ==================== page ==================== */

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Storage Management Demo — 配额、持久化与 OPFS</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 16px; line-height: 1.7; color: #343a40; }
  .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 14px 20px; margin: 16px 0; }
  .muted { color: #868e96; font-size: 14px; }
  code { background: #f1f3f5; padding: 1px 5px; border-radius: 4px; }
  button { margin: 2px 4px 2px 0; padding: 4px 10px; cursor: pointer; }
  #log { margin: 0; padding-left: 20px; font-size: 14px; }
  #log li { margin: 2px 0; }
  #opfs-files { margin: 0; padding-left: 20px; font-size: 14px; }
</style>
</head>
<body>
<h1>Storage Management Demo</h1>

<div class="card">
  <p><strong>用量与持久化</strong> <span class="muted">（estimate() 是近似值，浏览器可能为隐私填充数值，更新也略有延迟）</span></p>
  <p id="storage-summary">读取中……</p>
  <p id="persist-status" class="muted">读取中……</p>
  <p>
    <button onclick="runExperiment(refreshEstimate)">刷新用量</button>
    <button onclick="runExperiment(requestPersist)">申请持久化存储（persist()）</button>
  </p>
</div>

<div class="card">
  <p><strong>OPFS</strong> <span class="muted">（origin 私有文件系统：无磁盘路径，文件名仅本 origin 内有意义，计入配额）</span></p>
  <p>
    <button onclick="runExperiment(opfsWrite)">写入草稿文件</button>
    <button onclick="runExperiment(opfsRead)">读取最新草稿</button>
    <button onclick="runExperiment(opfsList)">列出全部文件</button>
    <button onclick="runExperiment(opfsClear)">清空 OPFS</button>
  </p>
  <ul id="opfs-files"></ul>
</div>

<div class="card">
  <p><strong>QuotaExceededError 恢复</strong> <span class="muted">（逐块写入 10MB 直到报错，上限 200MB，随后按"可再生数据先删"清理）</span></p>
  <button onclick="runExperiment(quotaStress)">写入压力测试</button>
</div>

<div class="card">
  <p><strong>日志</strong></p>
  <ul id="log" role="log" aria-live="polite"></ul>
</div>

<script>
  var logEl = document.getElementById("log")
  var stressRunning = false

  function log(message) {
    var item = document.createElement("li")
    var row = performance.now().toFixed(1) + "ms | " + message
    item.textContent = row
    console.log(row)
    logEl.append(item)
    while (logEl.children.length > 40) logEl.removeChild(logEl.firstElementChild)
  }

  function runExperiment(action) {
    return Promise.resolve().then(action).catch(function (error) {
      log("操作失败：" + error.name + " · " + error.message)
    })
  }

  function fmtBytes(value) {
    if (!value) return "0 B"
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB"
    return (value / 1024 / 1024).toFixed(1) + " MB"
  }

  function refreshEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) {
      document.getElementById("storage-summary").textContent = "当前环境不支持 estimate()"
      return
    }
    return navigator.storage.estimate().then(function (estimate) {
      var usage = estimate.usage || 0
      var quota = estimate.quota || 0
      var ratio = quota ? ((usage / quota) * 100).toFixed(3) + "%" : "-"
      document.getElementById("storage-summary").innerHTML =
        "usage ≈ <strong>" + fmtBytes(usage) + "</strong> / quota ≈ <strong>" +
        fmtBytes(quota) + "</strong>（" + ratio + "）"
    })
  }

  function refreshPersisted() {
    if (!navigator.storage || !navigator.storage.persisted) {
      document.getElementById("persist-status").textContent = "当前环境不支持 persisted()"
      return
    }
    return navigator.storage.persisted().then(function (persisted) {
      document.getElementById("persist-status").innerHTML = persisted
        ? "当前 origin 数据已标记为 <strong>persistent</strong>（自动回收优先级降低，但用户清理站点数据仍会删除）"
        : "当前 origin 数据为 <strong>best-effort</strong>：存储压力下可能被浏览器回收"
    })
  }

  function requestPersist() {
    if (!navigator.storage || !navigator.storage.persist) {
      log("当前环境不支持 persist()")
      return
    }
    return navigator.storage.persist().then(function (granted) {
      log(granted
        ? "persist() 返回 true：数据被标记为 persistent"
        : "persist() 返回 false：不是错误，应用继续工作，只是数据仍视为可回收")
      return refreshPersisted()
    })
  }

  function opfsSupported() {
    return !!(navigator.storage && typeof navigator.storage.getDirectory === "function")
  }

  async function opfsWrite() {
    if (!opfsSupported()) {
      log("当前环境不支持 OPFS（需要安全上下文，localhost 满足）")
      return
    }
    const root = await navigator.storage.getDirectory()
    const name = "draft-" + Date.now() + ".json"
    const handle = await root.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify({ text: "草稿内容", savedAt: new Date().toISOString() }))
    await writable.close()
    log("OPFS 写入 " + name + "——不暴露磁盘路径，随站点数据清理删除")
    runExperiment(refreshEstimate)
  }

  async function opfsNames() {
    const root = await navigator.storage.getDirectory()
    const names = []
    for await (const name of root.keys()) names.push(name)
    return names.sort()
  }

  async function opfsRead() {
    if (!opfsSupported()) {
      log("当前环境不支持 OPFS")
      return
    }
    const names = (await opfsNames()).filter(function (name) {
      return name.indexOf("draft-") === 0
    })
    if (!names.length) {
      log("还没有草稿文件，先写入一个")
      return
    }
    const latest = names[names.length - 1]
    const root = await navigator.storage.getDirectory()
    const file = await (await root.getFileHandle(latest)).getFile()
    log("读取 " + latest + "（" + fmtBytes(file.size) + "）：" + (await file.text()))
  }

  async function opfsList() {
    if (!opfsSupported()) {
      log("当前环境不支持 OPFS")
      return
    }
    const names = await opfsNames()
    const listEl = document.getElementById("opfs-files")
    listEl.innerHTML = ""
    if (!names.length) {
      var empty = document.createElement("li")
      empty.textContent = "(OPFS 为空)"
      empty.className = "muted"
      listEl.appendChild(empty)
      return
    }
    const root = await navigator.storage.getDirectory()
    for (const name of names) {
      const file = await (await root.getFileHandle(name)).getFile()
      var item = document.createElement("li")
      item.textContent = name + "（" + fmtBytes(file.size) + "）"
      listEl.appendChild(item)
    }
  }

  async function opfsClear() {
    if (stressRunning) {
      log("请等待压力测试清理完成后再清空 OPFS")
      return
    }
    if (!opfsSupported()) {
      log("当前环境不支持 OPFS")
      return
    }
    const names = await opfsNames()
    const root = await navigator.storage.getDirectory()
    for (const name of names) await root.removeEntry(name)
    log("已清空 OPFS 全部 " + names.length + " 个文件")
    runExperiment(refreshEstimate)
    runExperiment(opfsList)
  }

  async function quotaStress() {
    if (!opfsSupported()) {
      log("当前环境不支持 OPFS")
      return
    }
    if (stressRunning) {
      log("压力测试正在运行，请等待清理完成")
      return
    }
    stressRunning = true
    var root = null
    const names = []
    const runId = crypto.randomUUID()
    const chunk = 10 * 1024 * 1024
    var written = 0
    var removed = 0
    try {
      root = await navigator.storage.getDirectory()
      for (var i = 0; i < 20; i++) {
        const name = "stress-" + runId + "-" + i + ".bin"
        names.push(name)
        const handle = await root.getFileHandle(name, { create: true })
        const writable = await handle.createWritable()
        try {
          await writable.write(new Blob([new Uint8Array(chunk)]))
          await writable.close()
        } catch (error) {
          try { await writable.abort() } catch {
            // The stream may already be closed.
          }
          throw error
        }
        written++
        runExperiment(refreshEstimate)
      }
      log("写入 " + written * 10 + "MB 未触发 QuotaExceededError；达到本次测试上限，开始清理")
    } catch (error) {
      log("已完成 " + written + " 块，随后抛出 " + error.name + "：" + error.message)
    } finally {
      for (const name of names) {
        try {
          await root.removeEntry(name)
          removed++
        } catch (error) {
          if (error.name !== "NotFoundError") log("清理 " + name + " 失败：" + error.name)
        }
      }
      stressRunning = false
      log("清理完成：本次尝试的 " + names.length + " 个文件中，已删除 " + removed + " 个；其他失败见日志")
      runExperiment(refreshEstimate)
      runExperiment(opfsList)
    }
  }

  if (!window.isSecureContext) {
    log("当前不是安全上下文：OPFS 等 API 可能不可用（localhost 属于安全上下文）")
  }

  runExperiment(refreshEstimate)
  runExperiment(refreshPersisted)
  runExperiment(opfsList)
</script>
</body>
</html>`

/* ==================== demo ==================== */

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", "http://localhost")
  res.on("finish", () =>
    console.log(`[storageManagement] ${req.method} ${req.url} -> ${res.statusCode}`)
  )
  res.setHeader("Cache-Control", "no-store")
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204)
    res.end()
    return
  }
  if (url.pathname !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" })
    res.end("Method not allowed")
    return
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(req.method === "HEAD" ? undefined : PAGE)
})

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `[storageManagement] Port ${PORT} is in use. Choose another port with PORT=5005.`
      : `[storageManagement] ${error.message}`
  )
  process.exitCode = 1
})

server.listen(PORT, "127.0.0.1", () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  console.log(`storage management demo
  open http://localhost:${address.port} in a modern browser
  press Ctrl+C to stop; use PORT=5005 to choose another port

steps:
  1. inspect estimate(): usage and quota are approximate
  2. request persist(): false is a valid result, not an error
  3. write, read, and list an OPFS draft; refresh the usage estimate
  4. optionally run the quota probe: 10MB chunks with a 200MB cap
  5. inspect cleanup logs, then use Clear OPFS to reset draft files

notes:
  - OPFS requires browser support and a secure context; localhost is suitable
  - the quota probe cleans up its own files, including a partially written file
  - repeated quota probes cannot run concurrently in this page
  - stopping the server does not clear browser storage

observations:
  - the terminal prints HTTP requests and response status
  - the page and browser Console print timestamped experiment results
  - walkthrough: docs/browser/storage/storageManagement/README.md`)
})

export {}
