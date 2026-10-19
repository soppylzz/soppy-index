# Resource Hint：提前准备资源

script 属性决定执行模式，resource hint 影响资源准备。提前拿到文件，不会把 defer 改成 async，也不会自动执行一个尚未被消费的脚本。本文只展开资源准备与复用，不重复讲解各类脚本的执行条件。

## 1. 各种提示解决什么问题

| 提示 | 提前做什么 | 适用范围与边界 |
| --- | --- | --- |
| `preload` | 获取当前页面很快要用的明确资源 | `as` 与消费资源类型匹配；不会执行 JS 或应用 CSS |
| `modulepreload` | 获取模块，并完成模块解析/编译所需准备，放入模块映射 | 面向模块；浏览器可以进一步获取依赖，但不能假设一定递归预加载整个图 |
| `prefetch` | 尝试获取未来可能需要的资源 | 往往低优先级；可能因节流、网络或隐私策略忽略 |
| `preconnect` | 提前建立 origin 连接，可能包含 DNS、传输与 TLS 工作 | 不下载具体资源；应针对确实要访问的重要 origin |
| `dns-prefetch` | 提前解析域名 | 不建立完整连接，也不下载资源 |

定义见 [HTML：preload](https://html.spec.whatwg.org/multipage/links.html#link-type-preload)、[modulepreload](https://html.spec.whatwg.org/multipage/links.html#link-type-modulepreload)、[prefetch](https://html.spec.whatwg.org/multipage/links.html#link-type-prefetch)、[preconnect](https://html.spec.whatwg.org/multipage/links.html#link-type-preconnect) 和 [dns-prefetch](https://html.spec.whatwg.org/multipage/links.html#link-type-dns-prefetch)。提示的具体调度和是否采用受到浏览器策略影响。

## 2. preload 与消费端必须匹配

```html
<link rel="preload" href="/app.js" as="script" />
<script defer src="/app.js"></script>

<link rel="modulepreload" href="/entry.js" />
<script type="module" src="/entry.js"></script>

<link rel="preload" href="/font.woff2" as="font" type="font/woff2" crossorigin />
```

是否复用要看 URL、资源 destination、CORS/credentials 模式等获取条件，不能只看文件名相同。字体通常按 CORS 模式获取，所以同源字体 preload 也常需设置匹配的 `crossorigin`。

modulepreload 默认 destination 是 script，并按模块的 CORS 获取规则工作。普通 `preload as="script"` 不能等价替代模块准备；错误的请求模式或类型可能导致预加载结果无法被消费者使用。

优先处理那些浏览器无法尽早发现、但当前页面确实很快要用的资源，例如 CSS 中声明的字体。若 script 本就在 HTML 前部，预扫描已能发现，额外 preload 的收益可能很小。

## 3. 优先级与常见误用

`fetchpriority="high|low|auto"` 提供相对优先级提示，不规定精确的网络调度，也不改变脚本执行模式。浏览器仍会综合资源类型、发现位置、可见性和内部策略安排请求。

不要把整页资源都 preload。过多请求会争用带宽、连接和处理资源；未消费的 preload 还可能浪费下载。prefetch 也不能作为“下一页一定瞬间打开”的保证。

验证顺序是：先确认关键资源什么时候被发现，再比较 hint 对请求开始时间的影响，最后看它是否被实际消费以及是否改善关键路径。重复请求、模式不匹配和过量高优先级提示，都可能抵消收益。

## 4. 本目录对照实验

在仓库根目录运行 `pnpm --filter loading-next-lab dev`，打开 <http://127.0.0.1:5004/hints>，比较 classic 和 module 两组页面。服务先发送 head，600ms 后才发送消费标签所在的 HTML 尾部；未提前发送的字节无法被 preload scanner 扫描，因此能清楚观察提前发现的作用。

实验每次导航使用新的资源 URL，避免上次缓存影响；同次导航中 hint 与消费者使用完全一致的 URL。hint 资源允许缓存复用，其他普通顺序实验则使用 `no-store`。在 DevTools 中取消 Disable cache 后比较：

1. 无 hint 时，资源请求通常在消费标签到达后才开始。
2. 有 hint 时，资源请求可以从 head 开始；入口代码仍要等消费标签对应的执行条件。
3. 检查 Network 请求数量、Initiator 与时间线；modulepreload 是否同时提前请求依赖属于实现观察。

这组实验验证发现与消费关系，没有模拟跨 origin 连接建立、未来导航缓存策略或真实拥塞，因此不据此推导 preconnect/prefetch 的生产收益。这组页面只用于资源发现对照，不覆盖其余提示的所有行为。

### 核心实现：先发送 hint，后发送消费者

[Route Handler](demo/lib/handler.ts) 的 `/hints` 路由先为本次导航生成一个带 run id 的资源 URL，再让 hint 与消费者复用它。下面展示 classic preload 的精简流程，省略页面框架与参数校验：

```ts
const asset = scriptUrl("hint", 800, `&cache=1&run=${randomUUID()}`)
return documentStream(
  request,
  `<link rel="preload" as="script" href="${escapeHtml(asset)}">`,
  `<script defer src="${escapeHtml(asset)}"></script>`,
  600
)
```

无 hint 分支不发送 link；module 分支同时改为 modulepreload 和 `type="module"`。`documentStream` 延迟服务端 HTML 尾部，而非延迟脚本内部日志；hint 资源的 `cache=1` 分支允许复用，以免 no-store 干扰比较。
