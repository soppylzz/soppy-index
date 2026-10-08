import {
  demoHead,
  readPort,
  serveDemoAsset,
  startServer,
  logHttpRequest,
} from "../../../demo/server.ts"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/* ==================== config ==================== */

const PORT = readPort("PORT", 4000, true)

/* ==================== page ==================== */

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Web Storage 差异 Demo — localStorage vs sessionStorage</title>
${demoHead}
</head>
<body class="demo-page"><main>
<h1>Web Storage 差异 Demo</h1>
<p class="muted">本标签 ID：<strong id="tab-id"></strong>（存在 sessionStorage 里——刷新不变，新标签页会变）</p>

<div class="card">
  <p><strong>建议实验步骤</strong></p>
  <ol class="muted">
    <li>分别向 localStorage 和 sessionStorage 各写入一条数据（API 完全相同）。</li>
    <li>点击「重新加载本页」——两者都还在：sessionStorage 的生命周期是页面会话，不是页面。</li>
    <li>点击「打开第二个标签页」——新标签通过 noopener 打开，可见共享 localStorage，sessionStorage 从新的页面会话开始：它按标签页隔离。</li>
    <li>回到旧标签再写一条 localStorage，切到新标签看事件日志：本实验两个独立标签之间仅 localStorage 的变化会触发对方的 storage 事件；sessionStorage 不在两标签间共享。</li>
    <li>关闭新标签重新打开，或关掉浏览器再访问本页——不恢复旧页面会话时，新会话通常不保留原 sessionStorage；localStorage 是否保留还受隐私、清理和浏览器策略影响。</li>
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
    <button onclick="testQuota()">尝试较大写入（观察配额结果）</button>
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
  <p><strong>事件日志</strong> <span class="muted">(事件发给共享对应存储区域的其他文档；发起修改的文档不会收到)</span></p>
  <ul class="demo-log" id="log" role="log" aria-live="polite"></ul>
</div>

<p class="muted">注：本实验通过 noopener 避免新页复制 opener 的 sessionStorage；手动保留 opener 打开页面时，新页可能初始复制该存储，之后独立修改。两者都只存字符串，同步访问可能阻塞主线程；容量受实现和浏览器策略限制，且只存在于客户端，不会随 HTTP 请求发送。</p>

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

  const log = globalThis.Demo.createLogger(logEl, { limit: 30, clock: "relative", console: true })

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
    log("本标签清空两种存储（确有数据被清除时，其他共享文档可收到 key=null 的事件）")
    render()
  }

  function testQuota() {
    var probeKey = "__quota-probe-" + crypto.randomUUID()
    try {
      localStorage.setItem(probeKey, "x".repeat(6 * 1024 * 1024))
      localStorage.removeItem(probeKey)
      log("写入 6291456 个 ASCII 字符成功，临时数据已删除；本次成功不代表配额固定或下次一定成功")
    } catch (error) {
      log("写入 6291456 个 ASCII 字符抛出 " + error.name + (error.name === "QuotaExceededError" ? "：超出配额，setItem 未生效" : "：检查浏览器存储权限与环境"))
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
    log("收到其他文档的 storage 事件：" + area + "[" + key + "] " + event.oldValue + " → " + event.newValue)
    render()
  })

  window.addEventListener("error", function (event) { log("操作失败：" + event.message) })
  render()
</script>
</main></body>
</html>`

/* ==================== demo ==================== */

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (serveDemoAsset(req, res)) return
  const url = new URL(req.url ?? "/", "http://localhost")
  res.on("finish", () => logHttpRequest(req, res.statusCode, "webStorage"))
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

startServer(server, PORT, () => {
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
  - the quota probe attempts a temporary string with 6291456 ASCII characters and reports the actual result

observations:
  - the terminal prints HTTP requests and response status
  - the page and browser Console print timestamped experiment results
  - walkthrough: docs/browser/storage/webStorage/README.md`)
})

export {}
