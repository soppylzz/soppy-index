import { createServer } from "node:http"
import { readFileSync } from "node:fs"

function portOf(name: string, fallback: number): number {
  const port = Number(process.env[name] ?? fallback)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`)
  }
  return port
}
const port = portOf("PORT", 5008)
const peerPort = portOf("PEER_PORT", 5009)
if (port === peerPort) throw new Error("PORT and PEER_PORT must differ")
const origin = `http://127.0.0.1:${port}`
const peerOrigin = `http://127.0.0.1:${peerPort}`
const assets = new Map(
  ["common.js", "main.js", "frame.js", "worker.js", "style.css"].map((name) => [
    `/assets/${name}`,
    readFileSync(new URL(`./assets/${name}`, import.meta.url), "utf8"),
  ])
)

function page(frame: boolean): string {
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>跨上下文通信实验</title><link rel="stylesheet" href="/assets/style.css"></head>
<body data-parent="${origin}" data-peer="${peerOrigin}"><main>
<h1>${frame ? "接收上下文" : "跨上下文通信实验"}</h1>
<p id="identity"></p><p id="status" role="status"></p>
${
  frame
    ? `<p>仅接受指定父窗口、精确来源和合法结构。日志记录真实 message 事件。</p>`
    : `
<section><h2>1. 同源双标签</h2><p>打开第二页，等两页连接后发送。浏览器处理日志在接收页；没有接收方时请求会超时。</p>
<button id="open">打开第二标签（noopener）</button><button id="connect">连接 / 重连</button><button id="disconnect">关闭全部连接</button>
<table><tr><th>机制</th><th>操作</th></tr>
<tr><td>BroadcastChannel</td><td><button id="bc">广播请求</button><button id="clone">发送函数（克隆失败）</button></td></tr>
<tr><td>storage event</td><td><button id="storage">写入唯一请求</button><button id="same">重复相同值</button><button id="remove">删除实验 key</button></td></tr>
<tr><td>SharedWorker</td><td><button id="worker">共享计数 +1</button></td></tr></table>
<label><input id="mirror" type="checkbox">在本页创建第二个同名 BroadcastChannel 对象</label>
</section><section><h2>2. 双源 iframe 与 MessageChannel</h2>
<p>主页面源 A；接收 iframe 源 B（端口不同）。先等待 iframe 就绪；合法请求收到业务 ack。拒绝实验分别检查接收 iframe 或主页面日志。</p>
<button id="window">合法 window 请求</button><button id="bad-schema">非法结构</button><button id="bad-origin">错误 origin</button><button id="bad-source">错误 source</button><button id="bad-target">错误 targetOrigin</button>
<button id="channel">建立 / 重建端口</button><button id="port">转移 ArrayBuffer</button><button id="fail">业务失败</button><button id="silent">收到但不处理（超时）</button><button id="close-port">关闭端口</button><button id="reload-frame">重载接收 iframe</button>
<iframe id="trusted" title="可信跨源接收窗口" src="${peerOrigin}/frame"></iframe>
<details><summary>拒绝路径的两个真实发送窗口</summary><iframe id="origin-probe" title="错误来源窗口" src="${origin}/frame?role=origin"></iframe><iframe id="source-probe" title="同源但错误窗口" src="${peerOrigin}/frame?role=source"></iframe></details>
</section><p class="hint">调用返回只表示本地发送未抛异常；ack 才报告本实验处理结果。超时 1800ms 是应用策略，后台调度会影响它。关闭页面的通知尽力而为。日志最多 120 条；终端 HTTP 日志不证明消息处理。</p>`
}
<section><h2>按时间追加的日志</h2><ol id="log" role="log" aria-live="polite"></ol></section>
</main><script type="module" src="/assets/${frame ? "frame" : "main"}.js"></script></body></html>`
}

const servers = [port, peerPort].map((listenPort) => {
  const server = createServer((req, res) => {
    res.setHeader("Cache-Control", "no-store")
    res.on("finish", () => {
      const path = new URL(req.url ?? "/", origin).pathname
      console.log(
        `[communication:${listenPort}] ${req.method} ${encodeURI(path)} -> ${res.statusCode}`
      )
    })
    const path = new URL(req.url ?? "/", origin).pathname
    let status = 200
    let mime = "text/plain; charset=utf-8"
    let body = ""
    if (req.method !== "GET" && req.method !== "HEAD") {
      status = 405
      res.setHeader("Allow", "GET, HEAD")
      body = "Method not allowed"
    } else if (path === "/" || path === "/frame") {
      mime = "text/html; charset=utf-8"
      body = page(path === "/frame")
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
  return server
})

function shutdown(): void {
  for (const server of servers) server.close()
}
try {
  for (const [index, server] of servers.entries()) {
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject)
      server.listen(index === 0 ? port : peerPort, "127.0.0.1", resolve)
    })
    server.on("error", (error) => {
      console.error(`[communication] Server error: ${error.message}`)
      process.exitCode = 1
      shutdown()
    })
  }
  console.log(`Cross-context communication lab
  Main: ${origin}/
  Peer: ${peerOrigin}/frame
  Steps: open two main tabs; send BroadcastChannel, storage, and SharedWorker requests.
  Then use the iframe controls for window messaging, rejection probes, and port transfer.
  Observe timestamped page logs and browser Console; terminal logs show HTTP only.
  Conditions: use these exact origins in one browser profile; allow storage and workers.
  Both ports must be free. Override with PORT=5010 PEER_PORT=5011.
  SharedWorker support and background scheduling depend on the browser.
  Press Ctrl+C to stop both servers.`)
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
} catch (error) {
  const failure = error as NodeJS.ErrnoException
  console.error(
    failure.code === "EADDRINUSE"
      ? `[communication] Port conflict. Choose two free ports with PORT and PEER_PORT.`
      : `[communication] Startup failed: ${failure.message}`
  )
  process.exitCode = 1
  shutdown()
}
