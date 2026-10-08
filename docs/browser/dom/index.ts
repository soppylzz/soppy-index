import {
  ascii,
  closeServers,
  demoHead,
  readPort,
  serveDemoAsset,
  listenOnLoopback,
  logHttpRequest,
} from "../../demo/server.ts"
import { createServer } from "node:http"
import { readFileSync } from "node:fs"

const port = readPort("PORT", 5015)

const origin = `http://127.0.0.1:${port}`

const experiments = {
  tree: {
    title: "DOM：集合、状态与内容",
    body: '<p>进入时保存 static NodeList 和 live HTMLCollection。新增节点后比较；value attribute 与当前 property 分开修改。</p><button id="append">克隆 template 并插入 fragment</button><button id="collections">读取集合</button><ul id="list"><li class="item">初始节点</li></ul><template id="template"><li class="item">模板节点</li></template><form id="form-state"><label>输入状态 <input id="value" value="初始值"></label></form><button id="property">设置 value property</button><button id="attribute">设置 value attribute</button><button id="values">读取表单值</button><button id="reset">form reset 对照</button><hr><label>文本或标记 <input id="markup" value="&lt;b&gt;示例&lt;/b&gt;"></label><button id="text">通过 textContent 写入</button><button id="html">写入固定可信 HTML</button><button id="texts">比较三种读取</button><div id="content">可见文本<span hidden>隐藏文本</span></div>',
  },
  layout: {
    title: "CSSOM 与布局：盒尺寸、变换与读写",
    body: '<p>固定 content 宽 200px、padding 10px、border 3px，容器可滚动。比较布局尺寸与视觉矩形；耗时只能作为本次观测。</p><button id="metrics">读取盒尺寸</button><button id="transform">切换 scale(1.2)</button><button id="style">比较 inline / computed style</button><button id="interleave">交错读写（200 次）</button><button id="batch">批量读写（200 个节点）</button><div id="box">布局目标<div class="wide">超宽内容</div></div><div id="bench" aria-hidden="true"></div><p>benchmark 只用于 Performance trace 观察布局调用，单次耗时不能证明固定倍数或普遍更快。</p>',
  },
  events: {
    title: "DOM 事件：传播、委托与取消",
    body: '<p>点击目标本身可得到真实输入事件；dispatchEvent 明确使用脚本事件。捕获监听先记录，目标与祖先再按传播设置执行。</p><label>传播控制 <select id="propagation"><option value="none">不阻止</option><option value="stop">stopPropagation</option><option value="immediate">stopImmediatePropagation</option></select></label><label><input id="prevent" type="checkbox">目标 preventDefault</label><label><input id="passive" type="checkbox">目标第一个监听器 passive</label><button id="dispatch">同步 dispatchEvent</button><button id="once">派发两次 once 对照</button><div id="outer"><div id="inner"><button id="target">事件目标</button></div></div><p>链接默认行为独立对照：<a id="link" href="#event-default">跳到锚点</a>；勾选 preventDefault 后不跳转。</p><button id="add">新增委托按钮</button><div id="delegation"><button data-id="1"><span>委托子项 1</span></button></div><label>焦点目标 <input id="focus" placeholder="点击或按 Tab"></label><p id="event-default">默认锚点目标</p>',
  },
}
const assets = new Map(
  ["lab.js", "style.css"].map((name) => [
    `/assets/${name}`,
    readFileSync(new URL(`./assets/${name}`, import.meta.url), "utf8"),
  ])
)
function page(mode: keyof typeof experiments | "home"): string {
  const experiment = mode === "home" ? undefined : experiments[mode]
  const links = Object.entries(experiments)
    .map(([key, value]) => `<a href="/${key}">${value.title}</a>`)
    .join(" · ")
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${experiment?.title ?? "DOM 实验目录"}</title>${demoHead}<link rel="stylesheet" href="/assets/style.css"></head><body class="demo-page" data-mode="${mode}" ><main><nav><a href="/">实验目录</a> · ${links}</nav><h1>${experiment?.title ?? "DOM 实验目录"}</h1>${
    experiment
      ? `<p id="identity"></p><section><button id="connect">连接 / 重连</button><button id="disconnect">断开并清理</button><p id="status" role="status"></p>${experiment.body}</section><section><h2>操作与真实结果日志</h2><p>日志最多 120 条，包含 UTC 与上下文身份；操作日志不证明异步接收或业务处理。</p><ol class="demo-log" id="log" role="log" aria-live="polite"></ol></section><script type="module" src="/assets/lab.js"></script>`
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

const servers = [port].map((listenPort) =>
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
    res.on("finish", () => logHttpRequest(req, res.statusCode, `dom:${listenPort}`))

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
)
function shutdown(): void {
  closeServers(...servers)
}
try {
  for (const [index, server] of servers.entries()) {
    await listenOnLoopback(server, [port][index])
    server.on("error", (error) => {
      console.error(`[dom] Server error: ${ascii(error.message)}`)
      process.exitCode = 1
      shutdown()
    })
  }
  console.log(`DOM browser lab
  Directory: ${origin}/
  Routes: /tree, /layout, /events
  Port override: PORT=5016
  Steps: open a route; connect; use controls; compare actual results; disconnect and reconnect.
  Observe timestamped page logs and browser Console. HTTP logs prove requests only.
  Conditions: use a modern browser and these exact loopback origins; review per-page limits.
  Synthetic dispatch is labeled explicitly. Benchmark timings are observations, not promises.
  Press Ctrl+C to stop.`)
  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
} catch (error) {
  const failure = error as NodeJS.ErrnoException
  console.error(
    failure.code === "EADDRINUSE"
      ? "[dom] Port conflict. Set PORT to free ports."
      : `[dom] Startup failed: ${ascii(failure.message)}`
  )
  process.exitCode = 1
  shutdown()
}
