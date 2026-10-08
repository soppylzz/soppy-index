import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/* ==================== config ==================== */

const PORT = Number(process.env.PORT ?? 5003)
if (!Number.isInteger(PORT) || PORT < 0 || PORT > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535")
}

/* ==================== cache-controlled assets ==================== */

type Asset = {
  name: string
  policy: string
  etag: boolean
  lastModified: boolean
}

// fixed epoch so each version maps to one deterministic Last-Modified
const LAST_MODIFIED_EPOCH = Date.UTC(2026, 0, 1)

const ASSETS: Asset[] = [
  { name: "fresh.svg", policy: "public, max-age=60", etag: true, lastModified: false },
  { name: "short-fresh.svg", policy: "max-age=1", etag: true, lastModified: true },
  { name: "no-cache.svg", policy: "no-cache", etag: true, lastModified: false },
  { name: "last-modified.svg", policy: "no-cache", etag: false, lastModified: true },
  { name: "no-store.svg", policy: "no-store", etag: false, lastModified: false },
]

const assetByName = new Map(ASSETS.map((asset) => [asset.name, asset]))
const versions = new Map<string, number>()

function versionOf(asset: Asset): number {
  return versions.get(asset.name) ?? 1
}

function etagOf(asset: Asset): string {
  return `"${asset.name}-v${versionOf(asset)}"`
}

function lastModifiedOf(asset: Asset): string {
  return new Date(LAST_MODIFIED_EPOCH + versionOf(asset) * 1000).toUTCString()
}

// the rendered version doubles as observable content: a stale cache shows stale text
function assetSvg(asset: Asset): string {
  const version = versionOf(asset)
  const hue = (version * 67) % 360
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="44">` +
    `<rect width="150" height="44" rx="8" fill="hsl(${hue},70%,88%)" stroke="hsl(${hue},55%,38%)" stroke-width="2"/>` +
    `<text x="75" y="27" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" ` +
    `fill="hsl(${hue},55%,28%)">${asset.name} v${version}</text>` +
    `</svg>`
  )
}

/* ==================== conditional request handling ==================== */

function logRequest(req: IncomingMessage, status: number, note: string): void {
  console.log(`[cache-lab] ${req.method} ${req.url} -> ${status} ${note}`)
}

function validatorNote(req: IncomingMessage): string {
  const parts: string[] = []
  if (req.headers["if-none-match"]) parts.push(`If-None-Match: ${req.headers["if-none-match"]}`)
  if (req.headers["if-modified-since"]) {
    parts.push(`If-Modified-Since: ${req.headers["if-modified-since"]}`)
  }
  return parts.length ? `(${parts.join(", ")})` : "(first visit or bypassed cache)"
}

// If-None-Match takes precedence over If-Modified-Since
function clientHasCurrentValidator(
  req: IncomingMessage,
  etag: string | undefined,
  lastModified: string | undefined
): boolean {
  const ifNoneMatch = req.headers["if-none-match"]
  if (ifNoneMatch !== undefined) {
    return ifNoneMatch.split(",").some((candidate) => {
      const tag = candidate.trim()
      return tag === "*" || (etag !== undefined && tag.replace(/^W\//, "") === etag)
    })
  }
  const ifModifiedSince = req.headers["if-modified-since"]
  if (ifModifiedSince === undefined || lastModified === undefined) return false
  const seen = Date.parse(ifModifiedSince)
  return Number.isFinite(seen) && seen >= Date.parse(lastModified)
}

function serveAsset(req: IncomingMessage, res: ServerResponse, asset: Asset): void {
  const etag = etagOf(asset)
  const lastModified = lastModifiedOf(asset)
  const headers: Record<string, string> = {
    "Cache-Control": asset.policy,
    "Content-Type": "image/svg+xml",
  }
  if (asset.etag) headers["ETag"] = etag
  if (asset.lastModified) headers["Last-Modified"] = lastModified

  if (
    clientHasCurrentValidator(
      req,
      asset.etag ? etag : undefined,
      asset.lastModified ? lastModified : undefined
    )
  ) {
    res.writeHead(304, headers)
    res.end()
    logRequest(req, 304, validatorNote(req))
    return
  }
  res.writeHead(200, headers)
  res.end(req.method === "HEAD" ? undefined : assetSvg(asset))
  logRequest(req, 200, validatorNote(req))
}

// documents use no-cache like real entry HTML: stored, but revalidated on every reuse
function serveDocument(
  req: IncomingMessage,
  res: ServerResponse,
  html: string,
  etag: string
): void {
  const headers = {
    "Cache-Control": "no-cache",
    ETag: etag,
    "Content-Type": "text/html; charset=utf-8",
  }
  if (clientHasCurrentValidator(req, etag, undefined)) {
    res.writeHead(304, headers)
    res.end()
    logRequest(req, 304, `(document revalidated, ${etag})`)
    return
  }
  res.writeHead(200, headers)
  res.end(req.method === "HEAD" ? undefined : html)
  logRequest(req, 200, "(document: stored with no-cache, revalidated on next reuse)")
}

function sendJson(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  })
  res.end(JSON.stringify(data))
}

/* ==================== pages ==================== */

// client-side logic only; no template literals inside so the TS file needs no escaping
const STYLES = `
  body { font-family: system-ui, sans-serif; max-width: 860px; margin: 32px auto; padding: 0 16px; line-height: 1.7; color: #343a40; }
  .card { border: 1px solid #dee2e6; border-radius: 8px; padding: 14px 20px; margin: 16px 0; }
  .muted { color: #868e96; font-size: 14px; }
  code { background: #f1f3f5; padding: 1px 5px; border-radius: 4px; }
  button { margin: 2px 4px 2px 0; padding: 4px 10px; cursor: pointer; }
  .table-wrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 14px; }
  th, td { border: 1px solid #dee2e6; padding: 6px 10px; text-align: left; vertical-align: middle; }
  th { background: #f8f9fa; }
  img { vertical-align: middle; }
  ul, ol { padding-left: 20px; }
  #probe-log { margin: 8px 0 0; padding-left: 20px; font-size: 14px; }
  #probe-log li { margin: 2px 0; }
  a { color: #1971c2; }
`

const LAB_PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>HTTP Cache Demo — 复用情况观察</title>
<style>${STYLES}</style>
</head>
<body>
<h1>HTTP Cache Lab</h1>
<p class="muted">本页是一个按真实部署策略缩小的站点：文档本身用 <code>no-cache</code>（每次复用前都重新验证），
下方五张图片各持一种缓存策略。终端会打印每一个真正到达服务器的请求；
在 Network 面板显示 <code>(memory cache)</code> / <code>(disk cache)</code> 的资源<strong>根本不会出现在终端</strong>。</p>

<div class="card">
  <p><strong>观察步骤</strong></p>
  <ol>
    <li>首次加载：五个资源全部是 200 完整下载（终端逐条打印）。</li>
    <li>先在下方选择资源，用 <code>cache: default</code> 重复请求：fresh 通常本地复用；no-cache 验证；no-store 重新下载。</li>
    <li>在下方把某个资源的服务器版本改掉，再用 default 请求同一资源：no-cache 可拿到新版本；fresh 期内可能继续使用旧版本。改用 no-cache 请求可强制验证。</li>
    <li>等超过 1 秒再用 default 请求 short-fresh.svg，看 <code>max-age=1</code> 的资源从「本地复用」变成「304 协商」。</li>
    <li>硬刷新（<code>Cmd/Ctrl+Shift+R</code>）或勾选 Network 的 Disable cache：会改变请求缓存策略。普通刷新也可能要求验证，请结合 Network 和终端观察，不要假设固定结果。</li>
  </ol>
</div>

<div class="card">
  <p><strong>五种策略的复用情况</strong>
  <span class="muted">（展示每个资源最近一次 Resource Timing；200/304 的网络响应以终端与 Network 为准）</span>
  <button onclick="refreshTable()">重新观察</button></p>
  <div class="table-wrap">
  <table id="cache-table">
    <thead><tr><th>资源</th><th>响应策略</th><th>最终响应状态</th><th>transferSize</th><th>bodySize</th><th>判定</th></tr></thead>
    <tbody>
      <tr data-name="fresh.svg"><td><img src="/assets/fresh.svg" alt="fresh asset" width="150" height="44"></td><td><code>public, max-age=60</code></td><td class="obs-status">…</td><td class="obs-transfer">…</td><td class="obs-body">…</td><td class="obs-verdict">…</td></tr>
      <tr data-name="short-fresh.svg"><td><img src="/assets/short-fresh.svg" alt="short fresh asset" width="150" height="44"></td><td><code>max-age=1</code> + ETag</td><td class="obs-status">…</td><td class="obs-transfer">…</td><td class="obs-body">…</td><td class="obs-verdict">…</td></tr>
      <tr data-name="no-cache.svg"><td><img src="/assets/no-cache.svg" alt="no-cache asset" width="150" height="44"></td><td><code>no-cache</code> + ETag</td><td class="obs-status">…</td><td class="obs-transfer">…</td><td class="obs-body">…</td><td class="obs-verdict">…</td></tr>
      <tr data-name="last-modified.svg"><td><img src="/assets/last-modified.svg" alt="last-modified asset" width="150" height="44"></td><td><code>no-cache</code> + Last-Modified</td><td class="obs-status">…</td><td class="obs-transfer">…</td><td class="obs-body">…</td><td class="obs-verdict">…</td></tr>
      <tr data-name="no-store.svg"><td><img src="/assets/no-store.svg" alt="no-store asset" width="150" height="44"></td><td><code>no-store</code></td><td class="obs-status">…</td><td class="obs-transfer">…</td><td class="obs-body">…</td><td class="obs-verdict">…</td></tr>
    </tbody>
  </table>
  </div>
  <p class="muted">memory cache 与 disk cache 是浏览器内部存储层的实现细节：同一资源落在哪一层、保存多久都由浏览器决定；
  HTTP 语义层面只有「未验证复用 / 验证后复用 / 新响应」三种结果。</p>
</div>

<div class="card">
  <p><strong>修改服务器上的资源内容</strong>
  <span class="muted">（版本只改在服务器：选择同一资源发请求，比较谁读到新版本）</span></p>
  <p>
    <button onclick="bump('fresh.svg')">fresh.svg <span id="ver-fresh.svg">v?</span></button>
    <button onclick="bump('short-fresh.svg')">short-fresh.svg <span id="ver-short-fresh.svg">v?</span></button>
    <button onclick="bump('no-cache.svg')">no-cache.svg <span id="ver-no-cache.svg">v?</span></button>
    <button onclick="bump('last-modified.svg')">last-modified.svg <span id="ver-last-modified.svg">v?</span></button>
    <button onclick="bump('no-store.svg')">no-store.svg <span id="ver-no-store.svg">v?</span></button>
  </p>
</div>

<div class="card">
  <p><strong>fetch 的 cache 选项</strong>
  <span class="muted">（固定 URL、串行请求，结合终端确认是否访问网络及是否返回 304）</span></p>
  <p><label for="probe-asset">请求资源：</label><select id="probe-asset">
    <option>fresh.svg</option><option>short-fresh.svg</option><option>no-cache.svg</option>
    <option>last-modified.svg</option><option>no-store.svg</option>
  </select></p>
  <p>
    <button onclick="probe('default')">cache: default</button>
    <button onclick="probe('reload')">cache: reload</button>
    <button onclick="probe('no-store')">cache: no-store</button>
    <button onclick="probe('no-cache')">cache: no-cache</button>
    <button onclick="probe('force-cache')">cache: force-cache</button>
    <button onclick="probe('only-if-cached')">cache: only-if-cached</button>
  </p>
  <p class="muted">推荐玩法：先修改 <code>fresh.svg</code> 的服务器版本，再依次点 force-cache（无网络请求、返回旧版本）和
  no-cache（条件请求拿到新版本 200），对比「强制用缓存」与「强制验证」。</p>
  <ul id="probe-log" role="log" aria-live="polite" aria-label="HTTP 缓存实验日志"></ul>
</div>

<script>
  const table = document.getElementById("cache-table")
  const probeLog = document.getElementById("probe-log")
  let probeRunning = false
  performance.setResourceTimingBufferSize(1000)

  function logProbe(message) {
    const row = "[" + new Date().toISOString() + "] " + message
    const item = document.createElement("li")
    item.textContent = row
    probeLog.appendChild(item)
    while (probeLog.children.length > 50) probeLog.removeChild(probeLog.firstElementChild)
    console.log(row)
  }

  function latestEntry(name, since = 0, initiatorType = "") {
    const url = new URL("/assets/" + name, location.href).href
    const entries = performance.getEntriesByName(url, "resource").filter(entry =>
      entry.startTime >= since && (!initiatorType || entry.initiatorType === initiatorType))
    return entries.at(-1)
  }

  function timingSummary(entry) {
    if (!entry) return "尚无本次时序记录"
    if (entry.workerStart > 0) return "Service Worker 参与，请先排除其影响"
    if (entry.transferSize === 0 && entry.decodedBodySize > 0) return "本地复用迹象；结合终端确认"
    if (entry.transferSize > 0) return "存在网络传输；200/304 以终端和 Network 为准"
    return "信息不足，不能判断缓存来源"
  }

  function refreshTable() {
    for (const row of table.querySelectorAll("tr[data-name]")) {
      const entry = latestEntry(row.dataset.name)
      row.querySelector(".obs-status").textContent = entry?.responseStatus || "-"
      row.querySelector(".obs-transfer").textContent = entry ? entry.transferSize : "-"
      row.querySelector(".obs-body").textContent = entry ? entry.encodedBodySize : "-"
      row.querySelector(".obs-verdict").textContent = timingSummary(entry)
    }
  }

  async function requestJson(url, init) {
    const response = await fetch(url, init)
    if (!response.ok) throw new Error("HTTP " + response.status)
    return response.json()
  }

  async function refreshVersions() {
    try {
      const data = await requestJson("/api/versions")
      for (const [name, version] of Object.entries(data)) {
        document.getElementById("ver-" + name).textContent = "v" + version
      }
    } catch (error) { logProbe("读取服务端版本失败：" + error.message) }
  }

  async function bump(name) {
    try {
      const data = await requestJson("/api/bump?asset=" + encodeURIComponent(name), { method: "POST" })
      document.getElementById("ver-" + name).textContent = "v" + data.version
      logProbe("服务器把 " + name + " 改成 v" + data.version + "；缓存条目不会被主动通知")
    } catch (error) { logProbe("修改版本失败：" + error.message) }
  }

  async function probe(mode) {
    if (probeRunning) { logProbe("上一次请求尚未结束，请稍后重试"); return }
    probeRunning = true
    const name = document.getElementById("probe-asset").value
    const startedAt = performance.now()
    try {
      const init = { cache: mode }
      if (mode === "only-if-cached") init.mode = "same-origin"
      const response = await fetch("/assets/" + name, init)
      const body = await response.text()
      const version = body.match(/ v(\\d+)</)?.[1] || "未知"
      const entry = latestEntry(name, startedAt, "fetch")
      logProbe(name + " cache=" + mode + " → 最终 HTTP " + response.status + "，正文 v" + version +
        "；" + timingSummary(entry) + "；验证后的 304 可能合并为可读取的 200")
      refreshTable()
    } catch (error) { logProbe(name + " cache=" + mode + " → 失败：" + error.message) }
    finally { probeRunning = false }
  }

  window.addEventListener("load", refreshTable)
  refreshTable()
  void refreshVersions()
</script>
</body>
</html>`

/* ==================== demo ==================== */

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", "http://localhost")
  const pathname = url.pathname
  res.on("finish", () => {
    if (pathname.startsWith("/api/") || res.statusCode >= 400 || pathname === "/favicon.ico") {
      logRequest(req, res.statusCode, "")
    }
  })
  const sendError = (status: number, message: string) => {
    res.writeHead(status, {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    })
    res.end(req.method === "HEAD" ? undefined : message)
  }

  if (pathname === "/api/bump") {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST")
      sendError(405, "Method Not Allowed")
      return
    }
    const name = url.searchParams.get("asset") ?? ""
    const asset = assetByName.get(name)
    if (!asset) {
      sendJson(res, { error: "Unknown asset" }, 400)
      return
    }
    const version = versionOf(asset) + 1
    versions.set(name, version)
    console.log("[cache-lab] bump " + name + " -> v" + version + " (server content changed)")
    sendJson(res, { name, version })
    return
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD")
    sendError(405, "Method Not Allowed")
    return
  }
  if (pathname === "/") {
    serveDocument(req, res, LAB_PAGE, '"doc-http-cache-v2"')
    return
  }
  if (pathname.startsWith("/assets/")) {
    const asset = assetByName.get(pathname.slice("/assets/".length))
    if (asset) {
      serveAsset(req, res, asset)
      return
    }
  }
  if (pathname === "/api/versions") {
    const data = Object.fromEntries(ASSETS.map((asset) => [asset.name, versionOf(asset)]))
    if (req.method === "HEAD") {
      res.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
      })
      res.end()
    } else sendJson(res, data)
    return
  }
  if (pathname === "/favicon.ico") {
    res.writeHead(204, { "Cache-Control": "no-store" })
    res.end()
    return
  }
  sendError(404, "Not Found")
})

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EADDRINUSE"
      ? "[cache-lab] port " + PORT + " is in use. Try PORT=5007 node docs/browser/cache/index.ts"
      : "[cache-lab] failed to listen: " + error.message
  )
  process.exitCode = 1
})

server.listen(PORT, "127.0.0.1", () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  console.log(`http cache demo
  lab: http://localhost:${address.port}/
  versions: http://localhost:${address.port}/api/versions
  press Ctrl+C to stop; use PORT=5007 to choose another port

steps:
  1. Open the lab with DevTools Disable cache unchecked.
  2. Select an asset and repeat cache: default; compare fresh, no-cache, and no-store policies.
  3. Bump the server version, then compare force-cache with no-cache on fresh.svg.
  4. Wait over one second and request short-fresh.svg again to observe validation.
  5. Compare ETag and Last-Modified requests; try reload and only-if-cached modes.

observations:
  - the terminal shows actual HTTP responses and conditional request headers
  - the page and browser Console show timestamped probe results and Resource Timing hints
  - a revalidated response can appear as HTTP 200 to fetch; confirm wire-level 304 in server logs

conditions:
  - normal reload, hard reload, and DevTools settings may change cache behavior
  - use the same origin, remove interfering Service Workers, and start with clean site data if needed
  - stopping the server resets versions but does not clear browser HTTP cache
  - walkthrough: docs/browser/cache/demo.md`)
})

export {}
