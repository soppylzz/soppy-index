import {
  ascii,
  closeServers,
  demoHead,
  readPort,
  assertDistinctPorts,
  serveDemoAsset,
  listenOnLoopback,
  logHttpRequest,
} from "../../demo/server.ts"
import { createServer } from "node:http"
import { readFileSync } from "node:fs"

const port = readPort("PORT", 5013)
const peerPort = readPort("PEER_PORT", 5014)
assertDistinctPorts(port, peerPort)
const origin = `http://127.0.0.1:${port}`
const peerOrigin = `http://127.0.0.1:${peerPort}`
const experiments = {
  tools: {
    title: "Web API：URL、克隆与取消",
    body: '<p>先运行 URL / 克隆对照。网络实验由本地服务器真实延迟响应，取消不会回滚服务端已经完成的业务。</p><button id="url">URL 与查询参数</button><button id="clone">克隆与转移</button><button id="clone-error">克隆函数（拒绝）</button><hr><button id="fetch">请求 1200ms 延迟响应</button><button id="cancel">取消当前 fetch</button><button id="http-error">请求 404</button><button id="form">提交 FormData</button><p>FormData 由浏览器生成 boundary；服务只回显 MIME 与字节数，不解析字段，也不持久化。</p>',
  },
  files: {
    title: "文件、Object URL 与环境信号",
    body: '<p>生成本地 Blob 或选择文本文件（最多 64 KiB）；不会上传。Object URL 保留到显式释放或页面清理。</p><button id="blob">生成 Blob 并读取</button><label>选择本地文本文件 <input id="file" type="file" accept="text/*"></label><button id="object-url">创建 Object URL</button><button id="revoke">释放 Object URL</button><a id="download" hidden download="demo.txt">下载本地内容</a><button id="environment">读取环境信号</button><p>将浏览器宽度跨过 700px，观察真实 matchMedia change。onLine 不证明目标服务可达。</p>',
  },
  components: {
    title: "Web Components：生命周期与 Shadow DOM",
    body: '<p>点击组件内部按钮，比较 composed 自定义事件、target 重定向和路径。外部槽节点仍属于 light DOM。</p><button id="mount">挂载 / 移除同一实例</button><button id="attribute">更新 value attribute</button><button id="slot">更新 slot 内容</button><label><input id="composed" type="checkbox" checked>自定义事件 composed</label><button id="inspect">读取封装边界</button><div id="mount-point"></div>',
  },
  iframe: {
    title: "iframe：同源、跨源与 sandbox",
    body: '<p>三个独立文档：同源、不同端口跨源、allow-scripts 但未允许同源身份的 sandbox。先等就绪消息；load 事件不证明脚本已处理。</p><button id="read">读取三个 iframe 的 DOM</button><button id="message">发送合法跨源请求</button><button id="bad-message">发送非法结构</button><button id="reload">重载 iframe</button><p>跨源请求使用精确 targetOrigin，接收检查 origin、source、结构。sandbox 的不透明 origin 消息在父页被拒绝。</p><h3>同源文档</h3><iframe id="same" title="同源文档" src="__MAIN__/frame?role=same"></iframe><h3>跨源文档</h3><iframe id="cross" title="跨源文档" src="__PEER__/frame?role=cross"></iframe><h3>不透明 origin 文档</h3><iframe id="opaque" title="sandbox 文档" sandbox="allow-scripts" src="__MAIN__/frame?role=opaque"></iframe>',
  },
}
const assets = new Map(
  ["lab.js", "frame.js", "style.css"].map((name) => [
    `/assets/${name}`,
    readFileSync(new URL(`./assets/${name}`, import.meta.url), "utf8"),
  ])
)
function page(mode: keyof typeof experiments | "home"): string {
  const experiment = mode === "home" ? undefined : experiments[mode]
  const links = Object.entries(experiments)
    .map(([key, value]) => `<a href="/${key}">${value.title}</a>`)
    .join(" · ")
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${experiment?.title ?? "Web API 实验目录"}</title>${demoHead}<link rel="stylesheet" href="/assets/style.css"></head><body class="demo-page" data-mode="${mode}" data-peer="${peerOrigin}"><main><nav><a href="/">实验目录</a> · ${links}</nav><h1>${experiment?.title ?? "Web API 实验目录"}</h1>${
    experiment
      ? `<p id="identity"></p><section><button id="connect">连接 / 重连</button><button id="disconnect">断开并清理</button><p id="status" role="status"></p>${experiment.body.replaceAll("__MAIN__", origin).replaceAll("__PEER__", peerOrigin)}</section><section><h2>操作与真实结果日志</h2><p>日志最多 120 条，包含 UTC 与上下文身份；操作日志不证明异步接收或业务处理。</p><ol class="demo-log" id="log" role="log" aria-live="polite"></ol></section><script type="module" src="/assets/lab.js"></script>`
      : `<section><p>选择一个独立实验路由，按页面说明操作，观察页面日志与 DevTools Console。终端仅记录 HTTP。</p><table><tr><th>路由</th><th>实验</th></tr>${Object.entries(
          experiments
        )
          .map(
            ([key, value]) =>
              `<tr><td><a href="/${key}">/${key}</a></td><td>${value.title}</td></tr>`
          )
          .join("")}</table></section>`
  }</main></body></html>`
}
function framePage(): string {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${demoHead}<link rel="stylesheet" href="/assets/style.css"><title>iframe 子文档</title></head><body class="demo-page" data-parent="${origin}"><main><p id="frame-label">独立 iframe 文档</p><button id="inside">点击子文档按钮</button><ol class="demo-log" id="log"></ol></main><script defer src="/assets/frame.js"></script></body></html>`
}
const servers = [port, peerPort].map((listenPort) =>
  createServer((req, res) => {
    if (serveDemoAsset(req, res)) return
    res.setHeader("Cache-Control", "no-cache")
    let url: URL
    try {
      url = new URL(req.url ?? "/", origin)
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
      res.end("Invalid URL")
      return
    }
    const path = url.pathname
    res.on("finish", () => logHttpRequest(req, res.statusCode, `api:${listenPort}`))
    if (
      listenPort === port &&
      path === "/api/delay" &&
      (req.method === "GET" || req.method === "HEAD")
    ) {
      const ms = Number(url.searchParams.get("ms") ?? 1200)
      if (!Number.isInteger(ms) || ms < 0 || ms > 3000) {
        res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
        res.end(req.method === "HEAD" ? undefined : "ms must be an integer between 0 and 3000")
        return
      }
      const timer = setTimeout(() => {
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(req.method === "HEAD" ? undefined : JSON.stringify({ ok: true, delay: ms }))
      }, ms)
      res.once("close", () => clearTimeout(timer))
      return
    }
    if (listenPort === port && path === "/api/inspect" && req.method === "POST") {
      let bytes = 0
      let tooLarge = false
      req.on("data", (chunk: Buffer) => {
        bytes += chunk.length
        if (bytes > 65536 && !tooLarge) {
          tooLarge = true
          res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" })
          res.end("Body exceeds 65536 bytes")
        }
      })
      req.on("end", () => {
        if (tooLarge) return
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" })
        res.end(JSON.stringify({ contentType: req.headers["content-type"] ?? "", bytes }))
      })
      req.on("error", () => {
        if (!res.writableEnded) {
          res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" })
          res.end("Request body failed")
        }
      })
      return
    }
    let status = 200
    let mime = "text/plain; charset=utf-8"
    let body = ""
    if (req.method !== "GET" && req.method !== "HEAD") {
      status = 405
      res.setHeader("Allow", "GET, HEAD")
      body = "Method not allowed"
    } else if (path === "/frame") {
      mime = "text/html; charset=utf-8"
      body = framePage()
    } else if (listenPort === port && (path === "/" || Object.hasOwn(experiments, path.slice(1)))) {
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
)
function shutdown(): void {
  closeServers(...servers)
}
try {
  for (const [index, server] of servers.entries()) {
    await listenOnLoopback(server, [port, peerPort][index])
    server.on("error", (error) => {
      console.error(`[api] Server error: ${ascii(error.message)}`)
      process.exitCode = 1
      shutdown()
    })
  }
  console.log(`Web API browser lab
  Directory: ${origin}/
  Routes: /tools, /files, /components, /iframe
  Peer frame: ${peerOrigin}/frame
  Steps: open a route; connect; use controls; compare actual results; disconnect and reconnect.
  Observe timestamped page logs and browser Console. HTTP logs prove requests only.
  Conditions: use a modern browser and these exact loopback origins; review per-page limits.
  Port overrides: PORT=5017 PEER_PORT=5018. Both ports must be distinct and free.
  Sandbox messages with opaque origins are rejected. No permission prompts are triggered.
  Press Ctrl+C to stop.`)
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
} catch (error) {
  const failure = error as NodeJS.ErrnoException
  console.error(
    failure.code === "EADDRINUSE"
      ? "[api] Port conflict. Set PORT and PEER_PORT to free ports."
      : `[api] Startup failed: ${ascii(failure.message)}`
  )
  process.exitCode = 1
  shutdown()
}
