import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/* ==================== config ==================== */

const PORT = Number(process.env.PORT ?? 4000)
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error("PORT must be an integer from 0 to 65535")
}

/* ==================== page ==================== */

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Web Storage 差异 Demo — localStorage vs sessionStorage</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 16px; line-height: 1.7; color: #343a40; }
  .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 14px 20px; margin: 16px 0; }
  .muted { color: #868e96; font-size: 14px; }
  code { background: #f1f3f5; padding: 1px 5px; border-radius: 4px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #dee2e6; padding: 4px 10px; text-align: left; font-size: 14px; }
  td code { word-break: break-all; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 560px) { .cols { grid-template-columns: 1fr; } }
  button { margin: 2px 4px 2px 0; padding: 4px 10px; cursor: pointer; }
  input { padding: 3px 6px; }
  #log { margin: 0; padding-left: 20px; font-size: 14px; }
  #log li { margin: 2px 0; }
</style>
</head>
<body>
<h1>Web Storage 差异 Demo</h1>
<p class="muted">本标签 ID：<strong id="tab-id"></strong>（存在 sessionStorage 里——刷新不变，新标签页会变）</p>

<div class="card">
  <p><strong>建议实验步骤</strong></p>
  <ol class="muted">
    <li>分别向 localStorage 和 sessionStorage 各写入一条数据（API 完全相同）。</li>
    <li>点击「重新加载本页」——两者都还在：sessionStorage 的生命周期是页面会话，不是页面。</li>
    <li>点击「打开第二个标签页」——新标签通过 noopener 打开，可见共享 localStorage，sessionStorage 从新的页面会话开始：它按标签页隔离。</li>
    <li>回到旧标签再写一条 localStorage，切到新标签看事件日志：storage 事件只发给其他标签，且只对 localStorage 生效；写 sessionStorage 时谁也收不到。</li>
    <li>关闭新标签重新打开，或关掉浏览器再访问本页——sessionStorage 已清空，localStorage 仍在：生命周期差异。</li>
  </ol>
</div>

<div class="card">
  <p><strong>读写操作</strong> <span class="muted">（key/value 均为字符串，对象需自行 JSON 序列化）</span></p>
  <p>
    <input id="key" placeholder="key，如 theme" size="14">
    <input id="value" placeholder="value，如 dark" size="20">
  </p>
  <p>
    <button onclick="saveTo('local')">写入 localStorage</button>
    <button onclick="saveTo('session')">写入 sessionStorage</button>
    <button onclick="removeKey()">删除两种存储中该 key</button>
    <button onclick="clearBoth()">清空两者</button>
  </p>
  <p>
    <button onclick="reloadPage()">重新加载本页</button>
    <button onclick="openTab()">打开第二个标签页</button>
    <button onclick="testQuota()">写入 6MB 触发配额错误</button>
  </p>
</div>

<div class="card">
  <div class="cols">
    <div>
      <p><strong>localStorage 内容</strong> <span class="muted">(同 origin 所有标签共享)</span></p>
      <table><tbody id="local-rows"></tbody></table>
    </div>
    <div>
      <p><strong>sessionStorage 内容</strong> <span class="muted">(仅本标签可见)</span></p>
      <table><tbody id="session-rows"></tbody></table>
    </div>
  </div>
</div>

<div class="card">
  <p><strong>事件日志</strong> <span class="muted">(storage 事件只在“其他标签页”触发，发起修改的标签不会收到)</span></p>
  <ul id="log" role="log" aria-live="polite"></ul>
</div>

<p class="muted">注：本实验通过 noopener 避免新页复制 opener 的 sessionStorage；手动保留 opener 打开页面时，新页可能初始复制该存储，之后独立修改。两者都只存字符串、约 5MB 配额、同步阻塞主线程，且只存在于客户端，不会随 HTTP 请求发送。</p>

<script>
  var logEl = document.getElementById("log")
  var tabIdEl = document.getElementById("tab-id")

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  function log(message) {
    var item = document.createElement("li")
    var row = performance.now().toFixed(1) + "ms | " + message
    item.textContent = row
    console.log(row)
    logEl.append(item)
    while (logEl.children.length > 30) logEl.removeChild(logEl.firstElementChild)
  }

  function tabId() {
    var id = sessionStorage.getItem("tabId")
    if (!id) {
      id = crypto.randomUUID().slice(0, 8)
      sessionStorage.setItem("tabId", id)
    }
    return id
  }

  function rows(storage) {
    var html = ""
    for (var i = 0; i < storage.length; i++) {
      var key = storage.key(i)
      html += "<tr><td>" + esc(key) + "</td><td><code>" + esc(storage.getItem(key)) + "</code></td></tr>"
    }
    return html || '<tr><td colspan="2" class="muted">(空)</td></tr>'
  }

  function render() {
    tabIdEl.textContent = tabId()
    document.getElementById("local-rows").innerHTML = rows(localStorage)
    document.getElementById("session-rows").innerHTML = rows(sessionStorage)
  }

  function storageOf(kind) {
    return kind === "local" ? localStorage : sessionStorage
  }

  // not "write": inline onclick resolves against document before window, so document.write would win
  function saveTo(kind) {
    var key = document.getElementById("key").value.trim()
    var value = document.getElementById("value").value
    var name = kind === "local" ? "localStorage" : "sessionStorage"
    if (!key) {
      log("请先输入 key")
      return
    }
    try {
      storageOf(kind).setItem(key, value)
      log("本标签写入 " + name + "[" + key + "] = " + value)
      render()
    } catch (error) {
      log("写入 " + name + " 失败：" + error)
    }
  }

  function removeKey() {
    var key = document.getElementById("key").value.trim()
    if (!key) {
      log("请先输入 key")
      return
    }
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
    log("本标签从两种存储中删除 " + key)
    render()
  }

  function clearBoth() {
    localStorage.clear()
    sessionStorage.clear()
    log("本标签清空两种存储（其他标签会收到 key=null 的 storage 事件）")
    render()
  }

  function testQuota() {
    var probeKey = "__quota-probe-" + crypto.randomUUID()
    try {
      localStorage.setItem(probeKey, "x".repeat(6 * 1024 * 1024))
      localStorage.removeItem(probeKey)
      log("写入约 6MB 成功，临时数据已删除；本次成功不代表配额固定或下次一定成功")
    } catch (error) {
      log("写入约 6MB 抛出 " + error.name + (error.name === "QuotaExceededError" ? "：超出配额，setItem 未生效" : "：检查浏览器存储权限与环境"))
    }
  }

  function reloadPage() {
    location.reload()
  }

  function openTab() {
    window.open(location.href, "_blank", "noopener")
    log("已打开第二个标签页：去新标签对比两个表格，再在新标签里写入试试")
  }

  window.addEventListener("storage", function (event) {
    var area = event.storageArea === localStorage ? "localStorage" : "sessionStorage"
    var key = event.key === null ? "(clear)" : event.key
    log("收到其他标签的 storage 事件：" + area + "[" + key + "] " + event.oldValue + " → " + event.newValue)
    render()
  })

  window.addEventListener("error", function (event) { log("操作失败：" + event.message) })
  render()
</script>
</body>
</html>`

/* ==================== demo ==================== */

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", "http://localhost")
  res.on("finish", () => console.log(`[webStorage] ${req.method} ${req.url} -> ${res.statusCode}`))
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
      ? `[webStorage] Port ${PORT} is in use. Choose another port with PORT=5005.`
      : `[webStorage] ${error.message}`
  )
  process.exitCode = 1
})

server.listen(PORT, "127.0.0.1", () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  console.log(`web storage demo
  open http://localhost:${address.port} in a modern browser
  press Ctrl+C to stop; use PORT=5005 to choose another port

steps:
  1. write a value into localStorage and sessionStorage
  2. reload: both normally survive a page reload
  3. open a second tab with the page button (noopener): only localStorage is shared
  4. write again: storage events arrive in the other tab, not the writer
  5. close the new tab and open another to compare page sessions

notes:
  - use the same origin in both tabs; privacy and session restore policies may affect persistence
  - clearing storage affects all keys for this demo origin
  - the quota probe attempts a temporary 6MB string and reports the actual result

observations:
  - the terminal prints HTTP requests and response status
  - the page and browser Console print timestamped experiment results
  - walkthrough: docs/browser/storage/webStorage/README.md`)
})

export {}
