import {
  demoHead,
  readPort,
  serveDemoAsset,
  startServer,
  logHttpRequest,
} from "../../demo/server.ts"
import { createServer } from "node:http"
import { readFileSync } from "node:fs"

const port = readPort("PORT", 5010, false)
const origin = `http://127.0.0.1:${port}`
const assets = new Map(
  ["lab.js", "style.css"].map((name) => [
    `/assets/${name}`,
    readFileSync(new URL(`./assets/${name}`, import.meta.url), "utf8"),
  ])
)
const experiments = {
  mutation: {
    title: "MutationObserver：DOM 变化与批量记录",
    body: `<p>只观察下方目标树的 data-count、子节点和文本；日志区在观察树外。先连续修改，再比较同步读取队列和断开。</p>
<button id="mutate">同步连续修改三类 DOM</button><button id="drain">修改后立即 takeRecords</button><button id="discard">修改后立即 disconnect</button>
<div id="target" data-count="0"><span id="text">初始文本</span></div>`,
  },
  intersection: {
    title: "IntersectionObserver：滚动容器与阈值",
    body: `<p>两个 observer 共享 root，threshold=[0,0.5,1]，rootMargin 分别为 0px 和 80px。先等初始记录，再逐次滚动。蓝块被红层遮挡仍可能交叉。</p>
<button data-scroll="0">回到顶部</button><button data-scroll="60">滚动到 60px（提前区）</button><button data-scroll="150">滚动到 150px（半块）</button><button data-scroll="220">滚动到 220px（全块）</button><button data-scroll="440">滚动到 440px（离开）</button><button id="cover">切换视觉遮挡</button>
<div id="root" tabindex="0" aria-label="可滚动实验容器"><div class="spacer"></div><div id="target">被观察目标（100px 高）<div id="overlay" hidden>遮挡层</div></div><div class="spacer"></div></div>`,
  },
  resize: {
    title: "ResizeObserver：盒尺寸与有限反馈",
    body: `<p>两个 observer 分别观察 content-box 和 border-box。目标固定 content 宽 240px、padding 12px、border 4px。无需改变窗口大小。</p>
<button id="width">切换内容宽度</button><button id="padding">切换 padding</button><button id="transform">切换 transform（尺寸不变）</button><button id="unsafe">回调内写尺寸（最多三次）</button><button id="safe">下一帧写尺寸（最多三次）</button>
<p>反馈实验会先重连并复位。直接写入可能触发真实 ResizeObserver loop 错误；下一帧只推迟写入，停止依赖有限步数。本页不运行无限循环。</p><div id="target">尺寸目标</div>`,
  },
}
function page(mode: keyof typeof experiments | "home"): string {
  const experiment = mode === "home" ? undefined : experiments[mode]
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${experiment?.title ?? "Observer 实验目录"}</title>${demoHead}<link rel="stylesheet" href="/assets/style.css"></head>
<body class="demo-page" data-mode="${mode}"><main><nav><a href="/">实验目录</a> · <a href="/mutation">DOM 变化</a> · <a href="/intersection">交叉状态</a> · <a href="/resize">尺寸变化</a></nav><h1>${experiment?.title ?? "Observer 实验目录"}</h1>
${
  experiment
    ? `<p id="identity"></p><section><button id="connect">连接 / 重连</button><button id="disconnect">断开观察</button><p id="status" role="status"></p>${experiment.body}</section><section><h2>真实回调与操作日志</h2><p>操作只证明发起变化；「回调」才证明浏览器交付。日志最多 100 条；毫秒和批次数量不是固定保证。</p><ol class="demo-log" id="log" role="log" aria-live="polite"></ol></section><script type="module" src="/assets/lab.js"></script>`
    : `<section><p>每个页面只研究一种信号，使用真实浏览器 API，无构建步骤。</p><table><tr><th>路由</th><th>实验</th></tr>${Object.entries(
        experiments
      )
        .map(
          ([key, value]) => `<tr><td><a href="/${key}">/${key}</a></td><td>${value.title}</td></tr>`
        )
        .join(
          ""
        )}</table><p>打开独立页面，等待连接后操作，在页面日志与 DevTools Console 观察。HTTP 请求成功不能证明 observer 回调执行。</p></section>`
}</main></body></html>`
}
const server = createServer((req, res) => {
  if (serveDemoAsset(req, res)) return
  res.setHeader("Cache-Control", "no-cache")
  let path: string
  try {
    path = new URL(req.url ?? "/", origin).pathname
  } catch {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Invalid URL")
    return
  }
  res.on("finish", () => {
    logHttpRequest(req, res.statusCode, "observer")
  })
  let status = 200
  let mime = "text/plain; charset=utf-8"
  let body = ""
  if (req.method !== "GET" && req.method !== "HEAD") {
    status = 405
    res.setHeader("Allow", "GET, HEAD")
    body = "Method not allowed"
  } else if (path === "/" || Object.hasOwn(experiments, path.slice(1))) {
    mime = "text/html; charset=utf-8"
    body = page(path === "/" ? "home" : (path.slice(1) as keyof typeof experiments))
  } else if (assets.has(path)) {
    mime = path.endsWith(".css") ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8"
    body = assets.get(path)!
  } else if (path === "/favicon.ico") {
    status = 204
  } else {
    status = 404
    body = "Not found"
  }
  res.writeHead(status, { "Content-Type": mime })
  res.end(req.method === "HEAD" ? undefined : body)
})
startServer(server, port, () => {
  console.log(`Observer browser lab
  Directory: ${origin}/
  Routes: /mutation, /intersection, /resize
  Steps: open a route; wait for connection; use controls; disconnect and reconnect.
  Observe timestamped page logs and browser Console. HTTP logs show requests only.
  Conditions: use a modern browser with Observer APIs; keep the tab visible.
  Resize feedback is capped at three writes and may produce browser loop errors.
  Override the port with PORT=5012. This server listens on loopback only.
  Press Ctrl+C to stop.`)
})
