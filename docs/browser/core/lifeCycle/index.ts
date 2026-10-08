import {
  ascii,
  demoStyles,
  readPort,
  serveDemoAsset,
  startServer,
  logHttpRequest,
} from "../../../demo/server.ts"
import { createServer } from "node:http"

const port = readPort("PORT", 5006, true)

const reports: { receivedAt: string; payload: Record<string, unknown> }[] = []

/* ==================== browser lab ==================== */

const experiments = {
  loading: {
    title: "加载与重建",
    hint: "刷新比较 readyState、加载事件与 executionId；此页不启动计数器或自动上报。",
  },
  visibility: {
    title: "可见性与工作暂停",
    hint: "编辑草稿后切换真实标签，比较 timer/rAF 与应用主动暂停的轮询。",
  },
  bfcache: {
    title: "BFCache 与历史恢复",
    hint: "前往中转页后后退，对比 persisted、执行 ID 与计数；普通链接返回作为新文档对照。",
  },
  leave: {
    title: "离开提醒与草稿",
    hint: "勾选提醒并编辑后尝试离开；本地确认成功后移除 beforeunload。",
  },
  report: {
    title: "离页上报与接收",
    hint: "比较入队、HTTP 响应与服务端记录；自动 hidden 上报仅在此页启用。",
  },
  freeze: {
    title: "冻结、恢复与丢弃",
    hint: "使用 Chromium 调试工具控制真实冻结；不把普通刷新当成丢弃。",
  },
  history: {
    title: "同文档 History 与 hash",
    hint: "比较 pushState、replaceState、hashchange 与 popstate；看 URL、state 和同一个执行 ID。",
  },
  navigation: {
    title: "Location 文档导航",
    hint: "assign 增加记录，replace 替换当前记录，reload 重建文档；同 URL 的 hash 导航另见 History 页。",
  },
} as const
type Mode = keyof typeof experiments
const styles = demoStyles + `label { display: block; margin: 8px 0; }`
const browserScript = `
const executionId = crypto.randomUUID();
const mode = MODE_TOKEN;
const journalKey = "lifecycle-lab-journal:" + mode;
const draftKey = "lifecycle-lab-draft:" + mode;
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
  const shouldPoll = ["visibility", "freeze"].includes(mode) && !frozen && document.visibilityState === "visible";
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
  if (!document.getElementById("server-time")) return;
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
  if (draft) {
    draft.value = readStored(draftKey, "");
    draft.addEventListener("input", () => {
      dirty = true; store(draftKey, draft.value); syncWarning(); renderState();
    });
  }
  document.getElementById("save")?.addEventListener("click", () => {
    if (store(draftKey, draft.value)) {
      dirty = false; record("确认草稿", "本地确认完成；没有提交业务数据到服务器"); syncWarning();
    } else record("确认草稿失败", "sessionStorage 不可用");
    renderState();
  });
  document.getElementById("warning")?.addEventListener("change", event => {
    warningEnabled = event.target.checked; syncWarning(); renderState();
  });
  document.getElementById("beacon")?.addEventListener("click", () => sendBeaconReport("manual-beacon"));
  document.getElementById("keepalive")?.addEventListener("click", sendKeepaliveReport);
  document.getElementById("query-reports")?.addEventListener("click", showReports);
  document.getElementById("clear-log").addEventListener("click", () => { entries = []; record("清空日志"); });
  if (mode === "history") setupHistory();
  record("DOMContentLoaded", "当前实验=" + mode);
  renderState(); syncPolling();
});
window.addEventListener("load", () => record("load"));
window.addEventListener("pageshow", event => {
  record("pageshow", "persisted=" + event.persisted);
  warningEnabled = document.getElementById("warning")?.checked ?? false;
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
if (["visibility", "freeze", "bfcache"].includes(mode)) {
  let timerId;
  let frameId;
  function countFrame() { animationFrames++; frameId = requestAnimationFrame(countFrame); }
  function startCounters() {
    if (timerId !== undefined) return;
    timerId = setInterval(() => { timerTicks++; renderState(); }, 1000);
    frameId = requestAnimationFrame(countFrame);
  }
  function stopCounters() {
    clearInterval(timerId); cancelAnimationFrame(frameId); timerId = undefined;
  }
  window.addEventListener("pagehide", stopCounters);
  window.addEventListener("pageshow", startCounters);
  startCounters();
}
function setupHistory() {
  let pushes = 0, replacements = 0, pops = 0, hashes = 0, sequence = 0;
  function renderRoute() {
    const view = location.hash.slice(1) || (location.pathname.startsWith("/history/view/") ? location.pathname.split("/").pop() : "home");
    document.getElementById("route-view").textContent = "当前视图：" + view;
    document.getElementById("history-state").textContent = "URL: " + location.href + "\\nstate: " + JSON.stringify(history.state) +
      "\\nlength=" + history.length + " | push=" + pushes + " replace=" + replacements + " popstate=" + pops + " hashchange=" + hashes;
  }
  if (history.state === null) history.replaceState({ view: "initial" }, "", location.href);
  const actions = {
    push: () => { history.pushState({ view: "a", step: ++sequence }, "", "/history/view/a"); pushes++; renderRoute(); },
    replace: () => { history.replaceState({ view: "b", step: ++sequence }, "", "/history/view/b"); replacements++; renderRoute(); },
    "push-hash": () => { history.pushState({ view: "state-hash", step: ++sequence }, "", "#state-hash-" + sequence); pushes++; renderRoute(); },
    hash: () => { location.hash = "hash-" + (++sequence) + "-" + crypto.randomUUID().slice(0, 8); },
    "same-hash": () => { location.hash = location.hash; },
    back: () => history.back(), forward: () => history.forward(),
    "bad-origin": () => { const url = new URL(location.href); url.hostname = location.hostname === "localhost" ? "127.0.0.1" : "localhost"; history.pushState({}, "", url); },
    "bad-state": () => history.pushState({ bad: () => {} }, "", "/history/view/a")
  };
  for (const [id, action] of Object.entries(actions)) document.getElementById(id).addEventListener("click", () => {
    try { action(); record("History 调用返回", id + "；调用本身不等于事件回调"); }
    catch (error) { record("History 拒绝", id + " " + error.name); }
    renderRoute();
  });
  window.addEventListener("popstate", event => { pops++; record("popstate", "state=" + JSON.stringify(event.state)); renderRoute(); });
  window.addEventListener("hashchange", event => { hashes++; record("hashchange", event.oldURL + " → " + event.newURL); renderRoute(); });
  window.addEventListener("pageshow", renderRoute);
  renderRoute();
}
`
const navigation = `<nav><a class="control" href="/">实验目录</a>${Object.entries(experiments)
  .map(([mode, info]) => `<a class="control" href="/${mode}">${info.title}</a>`)
  .join("")}</nav>`
function shell(title: string, body: string, script = ""): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title><style>${styles}</style>${script ? `<script>${script}</script>` : ""}</head><body class="demo-page"><main><h1>${title}</h1>${navigation}${body}</main></body></html>`
}
const directory = shell(
  "生命周期与历史导航实验",
  `<p>每条路由只提供一个主题的操作。HTTP 日志不代表浏览器已执行；页面使用真实事件与执行身份记录。</p><section><table><tr><th>入口</th><th>观察重点</th></tr>${Object.entries(
    experiments
  )
    .map(
      ([mode, info]) =>
        `<tr><td><a href="/${mode}">${info.title}</a></td><td>${info.hint}</td></tr>`
    )
    .join("")}</table></section>`
)
function page(mode: Mode, target = false): string {
  const draft = ["visibility", "bfcache", "leave", "freeze"].includes(mode)
    ? `<section><h2>本标签草稿</h2><label for="draft">输入即备份到 sessionStorage，最多 2000 字</label><textarea id="draft" maxlength="2000"></textarea>${mode === "leave" ? '<label><input id="warning" type="checkbox">有待确认修改时注册 beforeunload</label>' : ""}<button id="save">保存并确认本地草稿</button><p class="hint">dirty 仅存于当前文档，本地备份不等于服务端提交。不同实验的草稿独立。</p></section>`
    : ""
  const transit = ["bfcache", "leave"].includes(mode)
    ? `<a id="transit" class="control" href="/between?from=/${mode}">前往中转页，再用后退返回</a>`
    : ""
  const serverTime = ["bfcache", "visibility", "freeze"].includes(mode)
    ? '<p>最近获取的服务端时间：<output id="server-time"></output></p>'
    : ""
  const reporting =
    mode === "report"
      ? `<section><h2>上报与服务端接收</h2><label><input id="auto-beacon" type="checkbox" checked>hidden 时自动 sendBeacon</label><button id="beacon">发送 Beacon</button><button id="keepalive">发送 keepalive fetch</button><button id="query-reports">查询服务端接收记录</button><pre id="reports">点击查询；进程内最多 100 条，包含其他实验标签。</pre><p>accepted=true 只说明入队，不保证送达。上报仅含事件元数据。</p></section>`
      : ""
  const historyControls =
    mode === "history"
      ? `<section><h2>同文档路由</h2><p id="route-view"></p><pre id="history-state"></pre><button id="push">pushState → /history/view/a</button><button id="replace">replaceState → /history/view/b</button><button id="push-hash">pushState 修改 hash</button><button id="hash">location.hash 新值</button><button id="same-hash">重复当前 hash</button><button id="back">back()</button><button id="forward">forward()</button><button id="bad-origin">拒绝跨源 URL</button><button id="bad-state">拒绝函数 state</button><p>push/replace 后 UI 由应用主动更新；popstate/hashchange 日志只在真实事件回调里追加。刷新子路径需要服务端 fallback。本实验仅对 /history/view/a 和 /history/view/b 提供入口。</p></section>`
      : ""
  const locationControls =
    mode === "navigation"
      ? `<section><h2>${target ? "已到达新文档目标" : "文档导航操作"}</h2>${target ? '<p>用 back 返回；assign 与 replace 的历史目标可能不同。</p><button id="nav-back" onclick="history.back()">back()</button><a href="/navigation">普通链接回到操作页</a>' : '<button id="assign" onclick="location.assign(&quot;/navigation/target?via=assign&quot;)">location.assign</button><button id="location-replace" onclick="location.replace(&quot;/navigation/target?via=replace&quot;)">location.replace</button>'}<button id="reload" onclick="location.reload()">location.reload()</button><button id="go-zero" onclick="history.go(0)">history.go(0)</button><p>目标 URL 的 via 标记用于观察操作来源；应结合实际 back 目标判断记录是否被替换。</p></section>`
      : ""
  return shell(
    experiments[mode].title,
    `<p class="hint">${experiments[mode].hint}</p><section><h2>状态与执行身份</h2><pre id="state"></pre>${serverTime}${transit}<button onclick="location.reload()">刷新并比较 executionId</button></section>${draft}${reporting}${historyControls}${locationControls}<section><h2>事件日志</h2><button id="clear-log">清空日志</button><p>每个实验在本标签独立保存最近 100 条日志，刷新后保留旧记录并追加新执行 ID；Console 同步输出。</p><pre class="demo-log" id="log" role="log" aria-live="polite"></pre></section><script>renderLog(); renderState();</script>`,
    browserScript.replace("MODE_TOKEN", JSON.stringify(mode))
  )
}
function betweenPage(from: Mode): string {
  return shell(
    "已离开实验页",
    `<section><p>后退时比较 pageshow.persisted、executionId 和计数；BFCache 由浏览器决定。</p><button onclick="history.back()">通过历史记录后退</button><p><a id="new-document" href="/${from}">通过普通链接打开新文档</a></p></section>`
  )
}

/* ==================== local server ==================== */

const server = createServer(async (request, response) => {
  if (serveDemoAsset(request, response)) return
  const url = new URL(request.url ?? "/", "http://localhost")
  const path = url.pathname
  response.on("finish", () => {
    logHttpRequest(request, response.statusCode, `HTTP ${new Date().toISOString()}`)
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
    if (path === "/") {
      send(200, "text/html; charset=utf-8", directory, "no-cache")
    } else if (path === "/between") {
      const from = url.searchParams.get("from") === "/leave" ? "leave" : "bfcache"
      send(200, "text/html; charset=utf-8", betweenPage(from), "no-cache")
    } else if (Object.hasOwn(experiments, path.slice(1))) {
      send(200, "text/html; charset=utf-8", page(path.slice(1) as Mode), "no-cache")
    } else if (path === "/history/view/a" || path === "/history/view/b") {
      send(200, "text/html; charset=utf-8", page("history"), "no-cache")
    } else if (path === "/navigation/target") {
      send(200, "text/html; charset=utf-8", page("navigation", true), "no-cache")
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
    console.error(`Request failed: ${ascii(String(error))}`)
    if (!response.headersSent) send(500, "text/plain; charset=utf-8", "Internal Server Error")
    else response.end()
  }
})

startServer(server, port, () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  const base = `http://localhost:${address.port}`
  console.log(`
page lifecycle demo started
  directory: ${base}/
${Object.keys(experiments)
  .map((mode) => `  ${mode}: ${base}/${mode}`)
  .join("\n")}
  reports: ${base}/api/reports

steps:
  1. Choose loading, visibility, freeze, leave, or report for one focused lifecycle experiment.
  2. Open bfcache, visit its transit page, and go back; compare persisted and executionId.
  3. Open history: compare pushState/replaceState with real popstate/hashchange callbacks.
  4. Reload /history/view/a to verify the explicit document fallback route.
  5. Open navigation: compare assign, replace, reload, and history.go(0).

observations:
  - the page and browser Console show browser events; the terminal only shows HTTP requests/responses

conditions:
  - keep the same host and port; BFCache, background throttling, and freezing depend on browser policy
  - this demo does not register unload; DevTools or extensions may affect BFCache, so retry without them
  - press Ctrl+C to stop; use PORT=5007 to choose another port
  - walkthrough: docs/browser/core/lifeCycle/index.md
`)
})
