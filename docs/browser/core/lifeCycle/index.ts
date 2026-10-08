import { createServer } from "node:http"

const port = Number(process.env.PORT ?? 5006)
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new Error("PORT must be an integer between 0 and 65535")
}

const reports: { receivedAt: string; payload: Record<string, unknown> }[] = []

/* ==================== browser lab ==================== */

const page = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>页面生命周期实验</title>
<style>
body{font:15px/1.7 system-ui,sans-serif;background:#f4f6f8;color:#243047;margin:0}
main{max-width:1000px;margin:36px auto;padding:0 20px}section{background:white;padding:20px;margin:18px 0;border:1px solid #dce2e9;border-radius:10px}
h1,h2{line-height:1.3}h2{font-size:19px}button,a.control{display:inline-block;padding:7px 12px;margin:5px 6px 5px 0;border:1px solid #aab9cc;border-radius:5px;background:#eef4fc;color:#174d91;cursor:pointer;font:inherit}
textarea{box-sizing:border-box;width:100%;min-height:90px;font:inherit}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f5f7fa;padding:12px}label{display:block;margin:8px 0}.hint{color:#57657a}#log{max-height:420px;overflow:auto;font:13px/1.7 ui-monospace,monospace}output{font-variant-numeric:tabular-nums}
</style>
<script>
const executionId = crypto.randomUUID();
const journalKey = "lifecycle-lab-journal";
const draftKey = "lifecycle-lab-draft";
let entries = [];
let storageAvailable = true;
let dirty = false;
let warningEnabled = false;
let warningAttached = false;
let timerTicks = 0;
let animationFrames = 0;
let pollingTicks = 0;
let pollingTimer = null;
let frozen = false;
const startedAt = Date.now();

function readStored(key, fallback) {
  try { return sessionStorage.getItem(key) ?? fallback; }
  catch { storageAvailable = false; return fallback; }
}
function store(key, value) {
  try { sessionStorage.setItem(key, value); return true; }
  catch { storageAvailable = false; return false; }
}
try { entries = JSON.parse(readStored(journalKey, "[]")); if (!Array.isArray(entries)) entries = []; }
catch { entries = []; }
entries = entries.filter(entry => typeof entry === "string").slice(-100);

function renderLog() {
  const log = document.getElementById("log");
  if (log) { log.textContent = entries.join("\\n"); log.scrollTop = log.scrollHeight; }
}
function record(name, details = "") {
  const line = new Date().toISOString() + " | " + executionId.slice(0, 8) + " | " +
    name + " | ready=" + document.readyState + " visibility=" + document.visibilityState +
    " focus=" + document.hasFocus() + (details ? " | " + details : "");
  entries.push(line);
  entries = entries.slice(-100);
  store(journalKey, JSON.stringify(entries));
  console.log(line);
  renderLog();
}
function beforeLeave(event) {
  record("beforeunload", "有待确认修改；是否显示对话框由浏览器决定");
  event.preventDefault();
  event.returnValue = "";
}
function syncWarning() {
  const shouldAttach = warningEnabled && dirty;
  if (shouldAttach === warningAttached) return;
  window[shouldAttach ? "addEventListener" : "removeEventListener"]("beforeunload", beforeLeave);
  warningAttached = shouldAttach;
  record("beforeunload listener", shouldAttach ? "已注册" : "已移除");
}
function renderState() {
  const state = document.getElementById("state");
  if (!state) return;
  state.textContent = "executionId: " + executionId + "\\nreadyState: " + document.readyState +
    " | visibility: " + document.visibilityState + " | focus: " + document.hasFocus() +
    "\\nwasDiscarded: " + ("wasDiscarded" in document ? document.wasDiscarded : "不支持") +
    " | freeze/resume: " + ("onfreeze" in document ? "接口可检测" : "未检测到接口") +
    "\\n待确认修改: " + dirty + " | beforeunload 监听: " + warningAttached +
    " | sessionStorage: " + (storageAvailable ? "可用" : "不可用，草稿/日志无法保证恢复") +
    "\\n墙钟经过: " + ((Date.now() - startedAt) / 1000).toFixed(1) + "s | timer: " + timerTicks +
    " | rAF: " + animationFrames + " | 应用轮询: " + pollingTicks;
}
function checkpoint(reason) {
  const draft = document.getElementById("draft");
  if (!draft) return;
  const saved = store(draftKey, draft.value);
  record("checkpoint", reason + (saved ? "：已写入本标签 sessionStorage" : "：写入失败"));
}
function syncPolling() {
  const shouldPoll = !frozen && document.visibilityState === "visible";
  if (shouldPoll && pollingTimer === null) {
    pollingTimer = setInterval(() => { pollingTicks++; }, 1000);
    record("应用轮询", "启动");
  } else if (!shouldPoll && pollingTimer !== null) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    record("应用轮询", "暂停");
  }
}
async function refreshServerTime(reason) {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const data = await response.json();
    document.getElementById("server-time").textContent = data.now;
    record("刷新服务端状态", reason + "：" + data.now);
  } catch (error) { record("刷新失败", String(error)); }
}
function makeReport(reason) {
  return JSON.stringify({ id: crypto.randomUUID(), executionId, reason,
    visibility: document.visibilityState, timerTicks, sentAt: new Date().toISOString() });
}
function sendBeaconReport(reason) {
  try {
    const accepted = navigator.sendBeacon("/api/report", makeReport(reason));
    record("sendBeacon", "accepted=" + accepted + "；需另查服务端接收记录");
  } catch (error) { record("sendBeacon 失败", String(error)); }
}
async function sendKeepaliveReport() {
  try {
    const response = await fetch("/api/report", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: makeReport("manual-keepalive"), keepalive: true
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    record("keepalive fetch", "当前页面仍能执行回调，收到 HTTP " + response.status);
  } catch (error) { record("keepalive fetch 失败", String(error)); }
}
async function showReports() {
  try {
    const response = await fetch("/api/reports", { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    document.getElementById("reports").textContent = JSON.stringify(await response.json(), null, 2);
  } catch (error) { record("查询接收记录失败", String(error)); }
}

record("script start", "新文档开始执行；跨文档历史日志保留前缀 ID");
document.addEventListener("readystatechange", () => { record("readystatechange"); renderState(); });
document.addEventListener("DOMContentLoaded", () => {
  const draft = document.getElementById("draft");
  draft.value = readStored(draftKey, "");
  draft.addEventListener("input", () => {
    dirty = true;
    store(draftKey, draft.value);
    syncWarning();
    renderState();
  });
  document.getElementById("save").addEventListener("click", () => {
    if (store(draftKey, draft.value)) {
      dirty = false;
      record("确认草稿", "本地确认完成；没有提交业务数据到服务器");
      syncWarning();
    } else { record("确认草稿失败", "sessionStorage 不可用"); }
    renderState();
  });
  document.getElementById("warning").addEventListener("change", event => {
    warningEnabled = event.target.checked; syncWarning(); renderState();
  });
  document.getElementById("beacon").addEventListener("click", () => sendBeaconReport("manual-beacon"));
  document.getElementById("keepalive").addEventListener("click", sendKeepaliveReport);
  document.getElementById("query-reports").addEventListener("click", showReports);
  document.getElementById("clear-log").addEventListener("click", () => { entries = []; record("清空日志"); });
  record("DOMContentLoaded", "恢复本标签草稿，未重新确认的编辑状态仅保存在当前堆中");
  renderState();
  syncPolling();
});
window.addEventListener("load", () => record("load"));
window.addEventListener("pageshow", event => {
  record("pageshow", "persisted=" + event.persisted);
  warningEnabled = document.getElementById("warning").checked;
  syncWarning();
  frozen = false;
  syncPolling();
  renderState();
  void refreshServerTime(event.persisted ? "BFCache 恢复" : "新文档展示");
});
window.addEventListener("pagehide", event => {
  record("pagehide", "persisted=" + event.persisted + "；true 也不保证之后一定能恢复");
  checkpoint("pagehide");
  if (pollingTimer !== null) { clearInterval(pollingTimer); pollingTimer = null; }
});
document.addEventListener("visibilitychange", () => {
  record("visibilitychange");
  if (document.visibilityState === "hidden") {
    checkpoint("hidden");
    if (document.getElementById("auto-beacon")?.checked) sendBeaconReport("hidden");
  } else { void refreshServerTime("重新可见"); }
  syncPolling();
  renderState();
});
document.addEventListener("freeze", () => {
  frozen = true; record("freeze"); checkpoint("freeze"); syncPolling(); renderState();
});
document.addEventListener("resume", () => {
  frozen = false; record("resume"); syncPolling(); renderState();
});
for (const name of ["focus", "blur"]) window.addEventListener(name, () => { record(name); renderState(); });
setInterval(() => { timerTicks++; renderState(); }, 1000);
function countFrame() { animationFrames++; requestAnimationFrame(countFrame); }
requestAnimationFrame(countFrame);
</script>
</head>
<body><main>
<h1>页面生命周期实验</h1>
<p class="hint">依次观察加载 → 切换标签 → 前进后退 → 冻结/恢复。日志来自真实事件；页面不注册 unload。</p>
<section><h2>1. 页面状态与执行身份</h2><pre id="state"></pre>
<p>最近获取的服务端时间：<output id="server-time">等待 pageshow</output></p>
<p class="hint">timer/rAF 是原生回调计数；应用轮询在 hidden/freeze 主动暂停。用墙钟比较经过时间，不能用回调次数计时。</p>
<a class="control" href="/between">前往中转页，再用后退返回</a>
<button type="button" onclick="location.reload()">刷新并比较 executionId</button>
</section>
<section><h2>2. 本标签草稿与离开提醒</h2>
<label for="draft">草稿（最多 2000 字；输入即备份到 sessionStorage）</label>
<textarea id="draft" maxlength="2000" placeholder="输入后切换标签、后退或刷新"></textarea>
<label><input id="warning" type="checkbox">有待确认修改时注册 beforeunload，尝试提示离开</label>
<button id="save" type="button">保存并确认本地草稿</button>
<p class="hint">自动备份不清除当前文档的待确认标记。确认后移除提醒。刷新会重建该标记；真实业务应持久化版本与同步状态。本地备份不等于服务端保存。</p>
</section>
<section><h2>3. 小数据上报与服务端接收</h2>
<label><input id="auto-beacon" type="checkbox" checked>hidden 时自动 sendBeacon（只发送事件元数据，不含草稿）</label>
<button id="beacon" type="button">发送 Beacon</button><button id="keepalive" type="button">发送 keepalive fetch</button>
<button id="query-reports" type="button">查询服务端接收记录</button>
<pre id="reports">点击查询；仅显示本次服务进程最近 100 条记录，包含其他实验标签。</pre>
<p class="hint">accepted=true 仅表示进入队列。终端 POST /api/report 与接收记录才说明服务器已接收；进程被杀、离线等仍可能丢失。</p>
</section>
<section><h2>4. 事件日志</h2><button id="clear-log" type="button">清空日志</button>
<p class="hint">最近 100 条日志跨同标签导航保留于 sessionStorage；ID 前缀区分新旧文档，Console 同步输出。可在 Chromium 的 chrome://discards 中手动冻结/丢弃后台实验标签；不支持时不会伪造事件。</p>
<pre id="log" role="log" aria-live="polite" aria-label="页面生命周期事件"></pre></section>
</main><script>renderLog(); renderState();</script></body></html>`

const betweenPage = `<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>生命周期中转页</title>
<body style="font:16px/1.8 system-ui;max-width:760px;margin:60px auto;padding:20px">
<h1>已离开实验页</h1><p>点击后退，比较 pageshow.persisted、executionId 和计数是否保留。</p>
<button type="button" onclick="history.back()">通过历史记录后退</button>
<p><a href="/">通过普通链接打开新文档（与后退对照）</a></p>
<p>BFCache 由浏览器决定，不能强制命中。若未命中，检查浏览器的 BFCache 诊断与新文档日志。</p>
</body></html>`

/* ==================== local server ==================== */

const server = createServer(async (request, response) => {
  const path = new URL(request.url ?? "/", "http://localhost").pathname
  response.on("finish", () => {
    console.log(
      `[HTTP ${new Date().toISOString()}] ${request.method} ${path} -> ${response.statusCode}`
    )
  })
  const send = (status: number, type: string, body: string, cache = "no-store") => {
    response.writeHead(status, { "Content-Type": type, "Cache-Control": cache })
    response.end(request.method === "HEAD" ? undefined : body)
  }
  const json = (value: unknown) =>
    send(200, "application/json; charset=utf-8", JSON.stringify(value))
  try {
    if (path === "/api/report") {
      if (request.method !== "POST") {
        response.setHeader("Allow", "POST")
        send(405, "text/plain; charset=utf-8", "Method Not Allowed")
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      for await (const chunk of request) {
        size += Buffer.byteLength(chunk)
        if (size > 8192) {
          send(413, "text/plain; charset=utf-8", "Report too large")
          return
        }
        chunks.push(Buffer.from(chunk))
      }
      let payload: Record<string, unknown>
      try {
        payload = JSON.parse(Buffer.concat(chunks).toString("utf8"))
        if (
          !payload ||
          typeof payload !== "object" ||
          Array.isArray(payload) ||
          typeof payload.id !== "string" ||
          payload.id.length > 100 ||
          typeof payload.reason !== "string" ||
          payload.reason.length > 100
        ) {
          throw new Error("Invalid report")
        }
      } catch {
        send(400, "text/plain; charset=utf-8", "Invalid report JSON")
        return
      }
      reports.push({ receivedAt: new Date().toISOString(), payload })
      if (reports.length > 100) reports.shift()
      send(204, "text/plain; charset=utf-8", "")
      return
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      response.setHeader("Allow", "GET, HEAD")
      send(405, "text/plain; charset=utf-8", "Method Not Allowed")
      return
    }
    if (path === "/" || path === "/between") {
      send(200, "text/html; charset=utf-8", path === "/" ? page : betweenPage, "no-cache")
    } else if (path === "/api/state") {
      json({ now: new Date().toISOString() })
    } else if (path === "/api/reports") {
      json(reports)
    } else if (path === "/favicon.ico") {
      send(204, "image/x-icon", "")
    } else {
      send(404, "text/plain; charset=utf-8", "Not Found")
    }
  } catch (error) {
    console.error("Request failed:", error)
    if (!response.headersSent) send(500, "text/plain; charset=utf-8", "Internal Server Error")
    else response.end()
  }
})

server.on("error", (error: NodeJS.ErrnoException) => {
  console.error(
    error.code === "EADDRINUSE"
      ? `Port ${port} is already in use. Try PORT=5007 node docs/browser/core/lifeCycle/index.ts`
      : error.message
  )
  process.exitCode = 1
})

server.listen(port, "127.0.0.1", () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  const base = `http://localhost:${address.port}`
  console.log(`
page lifecycle demo started
  lab:     ${base}/
  transit: ${base}/between
  reports: ${base}/api/reports

steps:
  1. Observe readyState, DOMContentLoaded, load, and pageshow; reload and compare executionId.
  2. Edit the draft, switch tabs, and inspect hidden checkpoints, paused polling, and refreshed state.
  3. Visit the transit page and go back; compare persisted, executionId, counters, and the draft.
  4. Enable the leave warning and edit; confirm the draft to compare beforeunload registration/removal.
  5. Compare Beacon queue acceptance with server receipt; Chromium can also test freeze/discard manually.

observations:
  - the page and browser Console show browser events; the terminal only shows HTTP requests/responses

conditions:
  - keep the same host and port; BFCache, background throttling, and freezing depend on browser policy
  - this demo does not register unload; DevTools or extensions may affect BFCache, so retry without them
  - press Ctrl+C to stop; use PORT=5007 to choose another port
  - walkthrough: docs/browser/core/lifeCycle/index.md
`)
})
