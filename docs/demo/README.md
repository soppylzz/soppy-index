# Demo 公共基础

[返回仓库首页](../../README.md)

浏览器 HTTP demo 共用这里的样式、端口监听和日志工具。模块没有独立服务，也不需要构建或新增依赖；仍从仓库根目录运行各实验的 `index.ts`，例如：

```bash
node docs/browser/dom/index.ts
```

访问启动引导给出的地址，按各实验的 README / index.md 操作；`Ctrl+C` 停止服务。最低运行环境为 Node >= 22.18。这里维护公共接口及样式名称，agent 编写流程由 [代码规范](../../.agents/prompts/conduct-of-code.md) 维护。

## 1. 文件与职责

| 文件 | 职责 |
| --- | --- |
| [styles.css](./styles.css) | 页面、卡片、控件、表格、提示和日志的统一外观 |
| [browser.js](./browser.js) | 浏览器 `globalThis.Demo.createLogger`；经典脚本与模块脚本均可调用 |
| [server.ts](./server.ts) | 白名单公共资源路由、端口参数、真实监听、关闭服务与英文 HTTP 日志 |
| [validation.md](./validation.md) | 本轮接入的实测环境、结果与限制 |

[Node HTTP](../node/http/README.md) 也使用本模块；其专用薄封装接口维护在该组 README。CSS 知识点采用[文字与 CSS 片段](../css/README.md)说明，不依赖本模块。

已接入 [API](../browser/api/README.md)、[DOM](../browser/dom/README.md)、[Observer](../browser/observer/README.md)、[通信](../browser/communication/README.md)、[加载](../browser/core/loading/README.md)、[生命周期](../browser/core/lifeCycle/README.md)、[HTTP 缓存](../browser/cache/README.md) 和 [Storage 四组实验](../browser/storage/README.md)。事件循环 CLI 模拟器有自己的虚拟时钟，不使用页面样式或浏览器 logger。

## 2. HTML 与样式契约

普通页面通过 `demoHead` 引入同源 `/demo/styles.css` 与 `/demo/browser.js`；顺序是公共样式、公共经典脚本、实验自己的样式和脚本。公共资源使用 `no-store`，避免样式改动被本地缓存隐藏；缓存实验的被测资源仍沿用各自响应头。

```html
<body class="demo-page">
  <main>
    <h1>实验名称</h1>
    <section class="card">
      <p class="hint">先预测，再操作，最后查看实际结果。</p>
      <button id="run">执行实验</button>
      <p id="status" role="status"></p>
    </section>
    <section class="card">
      <ol id="log" class="demo-log" role="log" aria-live="polite"></ol>
    </section>
  </main>
</body>
```

| 名称                    | 用途                                                              |
| ----------------------- | ----------------------------------------------------------------- |
| `.demo-page` + `main`   | 页面背景、字体、居中宽度和窄屏留白；必须显式添加 body 类名        |
| `.card`                 | 卡片；`main` 的直接子 `section` 也使用同样外观                    |
| `.hint` / `.muted`      | 补充说明与弱化提示                                                |
| `.demo-log`             | 列表或 pre 的等宽日志样式、自动换行与滚动高度；条数由 logger 限制 |
| `.table-wrap`           | 宽表格的水平滚动容器                                              |
| `.cols`                 | 两列布局，窄屏转单列                                              |
| `.row` / `nav`          | 自动换行的操作区与导航                                            |
| `.good` / `.bad`        | 通过与拒绝结果的颜色；同时写明文字，不只依赖颜色                  |
| `a.control`             | 外观与按钮一致的导航链接                                          |
| `#identity` / `#status` | 现有实验的上下文身份和连接状态，统一使用提示色                    |

主题颜色由 `--demo-bg`、`--demo-surface`、`--demo-text`、`--demo-muted`、`--demo-border`、`--demo-accent` 管理。机制相关 CSS 留在实验本地，例如 DOM 的 content-box、Observer 的可滚动 root 和目标尺寸、iframe 的高度、Shadow DOM 样式；公共样式不设置全局 `box-sizing`，避免改变测量对象。

加载与生命周期实验在 Node 端读取同一份 `demoStyles`，通过 `<style>` 内联，而非额外下载公共 stylesheet。加载实验的早期 recorder 继续先于被测资源安装，生命周期 recorder 继续维护恢复日志。它们保留专用记录器：前者需要在 body 出现前记录，后者需要跨页面恢复 journal。[DOMContentLoaded 的等待关系](https://developer.mozilla.org/en-US/docs/Web/API/Document/DOMContentLoaded_event)解释了为什么不能随意在早期观察代码前插入新的外部 CSS / 脚本。

## 3. 浏览器日志

公共脚本执行后，通过 `globalThis.Demo.createLogger(target, options)` 创建一个日志函数。每个日志容器只创建一个 logger；logger 本身不注册事件、不启动定时器，也不清理实验的连接。

```js
const log = globalThis.Demo.createLogger("#log", {
  limit: 120,
  context: crypto.randomUUID().slice(0, 8),
  clock: "utc",
  console: true,
})
log("已注册监听；等待真实事件")
```

| 参数      | 默认值  | 含义                                                             |
| --------- | ------- | ---------------------------------------------------------------- |
| `target`  | 必填    | `ol` / `ul` / `pre` 元素，或对应 CSS selector                    |
| `limit`   | `120`   | 正整数；只保留最近 N 行，按时间追加                              |
| `context` | `""`    | 可选上下文身份，同一个实验的所有日志复用同一身份                 |
| `clock`   | `"utc"` | `utc` 使用 ISO 时间；`relative` 使用当前文档 `performance.now()` |
| `console` | `false` | 是否将同一行镜像到浏览器 Console                                 |

返回的 `log(message)` 写入并返回格式为 `时间 [上下文] | 消息` 的字符串；无 context 时省略身份字段。消息通过 `String()` 转换，并使用 `textContent` 写入，不解析 HTML。时间戳用于观察，不能证明不同上下文之间存在严格全局顺序；相对时间也不能直接跨文档比较。`pre` 由 logger 独占内容，创建后首次写入会替换原内容；列表超过上限时从最早一行删除。

业务仍需自己区分「调用返回」「对端接收」「处理完成」并实现 ack、request id、超时和清理。不要把公共 logger 的成功写入或 HTTP 日志当作业务处理证据。worker 内不加载 DOM logger；通信的 common.js 仅在页面调用 `log()` 时惰性创建 logger，worker 只复用消息结构函数。

## 4. 服务端接口

从实验目录使用带 `.ts` 扩展名的相对 import，保证 Node 原生运行；根 `tsconfig.json` 的 `allowImportingTsExtensions` 与 `noEmit` 配合进行检查。

| 接口 | 行为与边界 |
| --- | --- |
| `demoHead` | 公共 link + classic script 的 HTML 字符串；在实验脚本之前插入 head |
| `demoStyles` | 与 styles.css 完全相同的字符串，仅供时序敏感页面内联 |
| `serveDemoAsset(req, res)` | 最先处理 `/demo/`；命中该前缀即结束响应并返回 true；仅两个已知文件可读取，未知文件 404，非 GET/HEAD 为 405，HEAD 无 body |
| `readPort(name, fallback, allowZero = false)` | 读取环境变量；仅接受十进制整数字符串，范围 1..65535；显式 allowZero 才接受 0 |
| `assertDistinctPorts(...ports)` | 多源实验启动前拒绝相同端口 |
| `listenOnLoopback(server, port)` | 真实绑定 `127.0.0.1`；成功才 resolve 实际端口，失败 reject；临时监听器随结果移除 |
| `startServer(server, port, ready)` | 单服务快捷入口：监听后执行 ready，英文报告错误并设置退出码，SIGINT/SIGTERM 关闭服务 |
| `closeServers(...servers)` | 停止接受新连接并关闭空闲 HTTP 连接；已进行的请求等待完成，不强制中断 |
| `logHttpRequest(req, status, label, note = "")` | 英文 HTTP 日志，包含标签、method、原始 URL、状态和可选证据说明 |
| `ascii(value)` | 转义非 ASCII 和控制字符，避免外部输入打断终端日志或混入中文 CLI 输出 |

端口检测直接使用 [Node server.listen](https://nodejs.org/docs/latest-v22.x/api/net.html#serverlistenport-host-backlog-callback) 的绑定结果，不先探测再释放端口，也不自动换端口。固定 origin 是跨源通信、cookie 和持久化实验的条件。仅原本支持动态端口的单源实验传入 `allowZero=true`，启动 URL 从 `server.address()` 获取；需要预先构造双源 URL 的实验必须使用非零端口。

下面是供新实验参考的最小接线，省略了实验路由和完整启动步骤；不能直接代替各 demo 的启动引导：

```ts
import { createServer } from "node:http"
import {
  demoHead,
  readPort,
  serveDemoAsset,
  startServer,
  logHttpRequest,
} from "../../demo/server.ts"

const port = readPort("PORT", 5016)
const server = createServer((req, res) => {
  if (serveDemoAsset(req, res)) return
  res.once("finish", () => logHttpRequest(req, res.statusCode, "example"))
  if ((req.url ?? "/") !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD" })
    res.end("Method not allowed")
    return
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" })
  res.end(
    req.method === "HEAD"
      ? undefined
      : `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>示例</title>${demoHead}</head><body class="demo-page"><main><section class="card">实验内容</section></main></body></html>`
  )
})
startServer(server, port, () =>
  console.log(`Example lab: http://127.0.0.1:${port}/; press Ctrl+C to stop.`)
)
```

多服务实验顺序 `await listenOnLoopback(...)`，全部成功后才打印引导；任一失败时关闭已经绑定的服务。运行时错误和进程信号也需要关闭整组服务，可参考 [通信入口](../browser/communication/index.ts) 或 [cookie 入口](../browser/storage/cookie/index.ts)。公共资源处理器自己记录 finish 日志，调用方不要再次记录同一次公共请求。
