import { labStyles, ascii, respond, labAsset, documentStream } from "./http.ts"
import { randomUUID } from "node:crypto"
import { setTimeout as delayResponse } from "node:timers/promises"

const MODES: Record<string, { title: string; prediction: string }> = {
  classic: {
    title: "普通 classic",
    prediction: "A、B 依次执行，执行时后方 DOM 尚未解析；即使 B 提前下载，也不能越过 A 执行。",
  },
  inline: {
    title: "内联 classic",
    prediction: "没有外部下载；遇到即执行，async/defer 属性不会让内联 classic 延后执行。",
  },
  async: {
    title: "async classic",
    prediction:
      "B 的响应更快，通常先执行；A 通常在 DOMContentLoaded 后执行，load 等待 A。顺序取决于就绪时间。",
  },
  defer: {
    title: "defer classic",
    prediction:
      "解析继续到后方 DOM；B 虽先下载，仍等待 A，按 A、B 的顺序执行后才触发 DOMContentLoaded。",
  },
  module: {
    title: "默认 module",
    prediction:
      "入口和静态依赖构成模块图；依赖先求值，再执行入口。无顶层 await 时，A、B 入口依次执行，随后 DOMContentLoaded。",
  },
  "async-module": {
    title: "async module",
    prediction:
      "等待各自模块图就绪，B 通常先执行；不按标签顺序，也不作为 DOMContentLoaded 的等待项。",
  },
  tla: {
    title: "module + 顶层 await",
    prediction:
      "A 的依赖挂起时，独立入口 B 和 DOMContentLoaded 可以继续；A 的依赖恢复后，A 入口才能执行。load 也不是应用就绪信号。",
  },
  dynamic: {
    title: "动态外部 classic：默认",
    prediction: "createElement 创建的外部 classic 默认 async；通常 B 先执行，不保证插入顺序。",
  },
  "dynamic-ordered": {
    title: "动态外部 classic：async = false",
    prediction:
      "插入前设置 async = false：并行下载，按插入顺序执行 A、B；不进入 defer 的 DOMContentLoaded 等待列表。",
  },
  innerhtml: {
    title: "innerHTML 与动态内联 classic",
    prediction: "innerHTML 中的 script 不执行；append 创建的内联 classic 在插入时同步执行。",
  },
  "css-only": {
    title: "慢 CSS，无受阻脚本",
    prediction:
      "CSS 加载期间 HTML 能继续解析，DOMContentLoaded 通常先于 CSS 完成；load 等待 CSS。日志不等于实际首帧时间。",
  },
  css: {
    title: "慢 CSS + 普通 classic",
    prediction:
      "脚本即使先下载，也等待前面的阻塞脚本样式表，后方 DOM 因 parser 等待脚本而迟迟不可见。",
  },
  "css-defer": {
    title: "慢 CSS + defer",
    prediction: "后方 DOM 先解析，但 defer 执行等待阻塞脚本的样式表，间接推迟 DOMContentLoaded。",
  },
}

function boundedDelay(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.max(0, Math.min(5000, parsed)) : fallback
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")
}

const STYLES = labStyles + `input { width: 72px; }`

// Install observers before the experiments and preserve logs until the body exists.
const OBSERVERS = `
window.labRows = []
window.record = function (label) {
  var row = performance.now().toFixed(1).padStart(7) + "ms | " +
    document.readyState.padEnd(11) + " | after=" +
    Boolean(document.getElementById("after")) + " | " + label
  window.labRows.push(row)
  if (window.labRows.length > 120) window.labRows.shift()
  console.log(row)
  var output = document.getElementById("log")
  if (output) output.textContent = window.labRows.join("\\n")
}
document.addEventListener("readystatechange", function () { record("readystatechange") })
document.addEventListener("DOMContentLoaded", function () { record("DOMContentLoaded") })
window.addEventListener("load", function () { record("window.load") })
window.addEventListener("error", function (event) {
  record("ERROR: " + (event.message || (event.target && (event.target.src || event.target.href))))
}, true)
window.addEventListener("unhandledrejection", function (event) { record("REJECTION: " + event.reason) })
var markerObserver = new MutationObserver(function () {
  if (document.getElementById("after")) {
    record("after marker observed")
    markerObserver.disconnect()
  }
})
markerObserver.observe(document, { childList: true, subtree: true })
record("head bootstrap")
`

function header(title: string): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Script Loading Lab</title><style>${STYLES}</style>
<script>${OBSERVERS}</script>`
}

function body(title: string, prediction: string): string {
  return `</head><body class="demo-page"><main><h1>${escapeHtml(title)}</h1><p><a class="link" href="/">返回实验目录</a></p>
<div class="card"><strong>预期与原因</strong><p>${escapeHtml(prediction)}</p></div>
<p class="muted">日志：相对导航的时间 | readyState | 后方 DOM 是否存在 | 事件。同步执行不会被 async 抢占。
请打开 DevTools Network 与 Console；响应延迟只用于拉开就绪时间，毫秒值和竞争顺序以本次观察为准。</p>
<div class="card"><pre class="demo-log" id="log" aria-live="polite"></pre></div>`
}

function scriptUrl(id: string, delay: number, extra = ""): string {
  return `/asset.js?id=${id}&delay=${delay}${extra}`
}

function experimentScripts(mode: string, a: number, b: number, work: number): string {
  const urls = [scriptUrl("A", a, `&work=${work}`), scriptUrl("B", b, `&work=${work}`)]
  if (mode === "css-only") return ""
  if (mode === "inline") {
    return '<script async defer>record("inline classic A")</script><script>record("inline classic B")</script>'
  }
  if (mode === "innerhtml") {
    return `<script>
var container = document.createElement("div")
document.head.append(container)
container.innerHTML = "<script>record('innerHTML script ran')<" + "/script>"
record("innerHTML insertion returned: no execution")
var inlineScript = document.createElement("script")
inlineScript.textContent = "record('dynamic inline classic')"
record("before append inline")
document.head.append(inlineScript)
record("after append inline")
</script>`
  }
  if (mode === "dynamic" || mode === "dynamic-ordered") {
    return `<script>
${JSON.stringify(urls)}.forEach(function (url) {
  var script = document.createElement("script")
  ${mode === "dynamic-ordered" ? "script.async = false" : ""}
  script.src = url
  record("append external: async=" + script.async)
  document.head.append(script)
})
</script>`
  }
  return urls
    .map((url, index) => {
      let attributes = ""
      if (mode === "async") attributes = "async"
      if (mode === "defer" || mode === "css-defer") attributes = "defer"
      if (["module", "async-module", "tla"].includes(mode)) {
        attributes = `type="module"${mode === "async-module" ? " async" : ""}`
        url = scriptUrl(index === 0 ? "A" : "B", 0, `&module=1&depDelay=${index === 0 ? a : b}`)
        if (mode === "tla" && index === 0) url += "&tla=1400"
      }
      return `<script ${attributes} src="${escapeHtml(url)}"></script>`
    })
    .join("\n")
}

function send(request: Request, content: string, type: string, status = 200): Response {
  return respond(request, content, `${type}; charset=utf-8`, status)
}

export async function handle(req: Request): Promise<Response> {
  const asset = labAsset(req)
  if (asset) return asset
  if (req.method !== "GET" && req.method !== "HEAD")
    return respond(req, "Method not allowed", "text/plain", 405, { Allow: "GET, HEAD" })
  const url = new URL(req.url)
  const params = url.searchParams

  if (url.pathname === "/favicon.ico") {
    return respond(req, null, "image/x-icon", 204)
  }
  if (url.pathname === "/") {
    return send(
      req,
      `${header("Script Loading Lab")}${body("Script Loading Lab", "选择实验，在真实浏览器中比较资源就绪、解析进度与执行顺序。")}
<div class="card"><nav>${Object.entries(MODES)
        .map(([mode, info]) => `<a class="link" href="/experiment?mode=${mode}">${info.title}</a>`)
        .join("\n")}</nav></div>
<div class="card"><h2>提前发现资源</h2><nav>
<a class="link" href="/hints?kind=classic&hint=none">classic 对照</a>
<a class="link" href="/hints?kind=classic&hint=preload">preload classic</a>
<a class="link" href="/hints?kind=module&hint=none">module 对照</a>
<a class="link" href="/hints?kind=module&hint=modulepreload">modulepreload</a>
</nav><p>在 Network 查看请求开始时间与 Initiator；hint 不会直接执行脚本。</p></div>
<script>record("index body parsed")</script></main></body></html>`,
      "text/html"
    )
  }
  if (url.pathname === "/experiment") {
    const mode = params.get("mode") ?? "classic"
    const info = Object.hasOwn(MODES, mode) ? MODES[mode] : undefined
    if (!info) {
      return send(req, "Unknown experiment", "text/plain", 400)
    }
    const a = boundedDelay(params.get("a"), 900)
    const b = boundedDelay(params.get("b"), 100)
    const tail = boundedDelay(params.get("tail"), 500)
    const css = boundedDelay(params.get("css"), 1300)
    const work = boundedDelay(params.get("work"), 0)
    const stylesheet = mode.startsWith("css")
      ? `<link rel="stylesheet" href="/slow.css?delay=${css}">`
      : ""
    const head = header(info.title) + stylesheet + experimentScripts(mode, a, b, work)
    // The delayed chunk makes parser progress observable even on localhost.
    return documentStream(
      req,
      head,
      `${body(info.title, info.prediction)}
<form action="/experiment" class="card"><input type="hidden" name="mode" value="${mode}">
<label>A 响应 ms <input class="input" name="a" type="number" min="0" max="5000" value="${a}"></label>
<label>B 响应 ms <input class="input" name="b" type="number" min="0" max="5000" value="${b}"></label>
<label>HTML 尾部 ms <input class="input" name="tail" type="number" min="0" max="5000" value="${tail}"></label>
<label>CSS 响应 ms <input class="input" name="css" type="number" min="0" max="5000" value="${css}"></label>
<label>classic 执行 ms <input class="input" name="work" type="number" min="0" max="5000" value="${work}"></label>
<button class="button button--secondary">按此参数重新导航</button></form>
<p class="muted">module 的 A/B 参数控制各自静态依赖的响应；顶层 await 实验另有固定 1400ms 异步等待。
work 仅对外部 classic 生效，会占用主线程。不同模式的执行路径请结合配套文档阅读。</p>
<div id="after" class="card">后方 DOM 标记：parser 到这里才会创建我。</div>
<img src="/slow.svg?delay=1600" width="180" height="30" alt="用于观察 load 等待的普通图片">
</main></body></html>`,
      tail
    )
  }
  if (url.pathname === "/hints") {
    const module = params.get("kind") === "module"
    const hint = params.get("hint") ?? "none"
    if (hint !== "none" && hint !== (module ? "modulepreload" : "preload")) {
      return send(req, "Hint must match script kind", "text/plain", 400)
    }
    const asset = scriptUrl(
      "hint",
      800,
      `&cache=1&run=${randomUUID()}${module ? "&module=1&depDelay=100" : ""}`
    )
    const link =
      hint === "none"
        ? ""
        : `<link rel="${hint}" ${module ? "" : 'as="script"'} href="${escapeHtml(asset)}">`
    const head = header(`${hint} / ${module ? "module" : "classic"}`) + link
    return documentStream(
      req,
      head,
      `${body("Resource Hint", "消费标签在 600ms 后的 HTML chunk 才出现。对比 Network：hint 可提前发起请求；是否复用需结合 URL、类型和 fetch 设置判断。")}
<div id="after">消费标签即将出现</div><script>record("consumer tag about to be parsed")</script>
<script ${module ? 'type="module"' : "defer"} src="${escapeHtml(asset)}"></script>
<script>record("HTML tail parsed (not EOF)")</script></main></body></html>`,
      600
    )
  }
  if (url.pathname === "/asset.js" || url.pathname === "/dependency.js") {
    const id = params.get("id") === "B" ? "B" : params.get("id") === "hint" ? "hint" : "A"
    const delay = boundedDelay(params.get("delay"), 0)
    const work = boundedDelay(params.get("work"), 0)
    const tla = boundedDelay(params.get("tla"), 0)
    let source: string
    if (url.pathname === "/dependency.js") {
      source = `window.record("dependency ${id}: start")\n`
      if (tla) {
        source += `await new Promise(resolve => setTimeout(resolve, ${tla}))\nwindow.record("dependency ${id}: resumed after await")\n`
      }
      source += `export const name = ${JSON.stringify(id)}\n`
    } else if (params.has("module")) {
      const dependency = `/dependency.js?id=${id}&delay=${boundedDelay(params.get("depDelay"), 0)}&tla=${tla}`
      source = `import { name } from ${JSON.stringify(dependency)}\nwindow.record("module entry " + name)\n`
    } else {
      source = `window.record("classic ${id}: start")\n`
      if (work)
        source += `{ const end = performance.now() + ${work}; while (performance.now() < end) {} }\n`
      source += `window.record("classic ${id}: end")\n`
    }
    console.log(`[loading-lab] request ${ascii(req.url ?? "/")}: response delayed ${delay}ms`)
    if (req.method !== "HEAD") await delayResponse(delay, undefined, { signal: req.signal })
    return respond(req, source, "text/javascript; charset=utf-8", 200, {
      "Cache-Control": params.has("cache") ? "private, max-age=3600" : "no-store",
    })
  }
  if (url.pathname === "/slow.css" || url.pathname === "/slow.svg") {
    const css = url.pathname.endsWith("css")
    if (req.method !== "HEAD")
      await delayResponse(boundedDelay(params.get("delay"), 0), undefined, { signal: req.signal })
    return send(
      req,
      css
        ? "#after { border-left: 5px solid #2b8a3e; }"
        : '<svg xmlns="http://www.w3.org/2000/svg" width="180" height="30"><text x="0" y="22">Image loaded</text></svg>',
      css ? "text/css" : "image/svg+xml"
    )
  }
  return send(req, "Not found", "text/plain", 404)
}
