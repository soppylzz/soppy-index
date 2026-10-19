# Script Loading：解析、加载与执行

[渲染流水线](../rendering/rendering.md) 已说明 HTML parser、CSS 与普通脚本的基本关系。本文进一步追踪：一个 script 被发现后，资源何时就绪、何时允许执行，以及它如何影响后续 DOM 和页面事件。实验入口见 [实验走查](experiment.md)，资源提示见 [Resource Hint](./resource-hints.md)。

## 1. 先分清三个过程

这里的 parser 主要指 **HTML parser**：它根据输入构建 DOM。JavaScript 引擎也会解析、编译代码，但那是另一层工作，不能用“async 不阻塞 parser”推导出“async 不占用主线程”。

| 过程 | 做什么 | 与其他过程的关系 |
| --- | --- | --- |
| 发现与获取 | 从标签、预扫描、hint 或动态代码找到 URL，获取资源 | 可与 HTML 解析重叠；网络完成不等于脚本已执行 |
| 准备脚本 | classic 准备脚本；module 还需加载、解析与链接静态依赖图 | 具体编译策略由引擎决定；不能画成所有引擎固定的线程流水线 |
| 执行与求值 | 在允许的时机运行代码 | 同一 Window 主线程上的同步 JS 会占用 HTML 解析、事件处理与渲染所需的执行时间 |

主 parser 因 classic 暂停时，preload scanner 仍可能提前发现后面的外部脚本。因此 Network 中 B 比 A 早开始、甚至早下载完，都不能单独证明 B 先执行。动态拼出的 URL 也不一定能被预扫描提前发现。

```text
发现 URL → 获取资源 → 脚本/模块图就绪 → 满足该模式的执行条件 → 执行
                                  ↑
                      解析状态、顺序、样式表、依赖关系
```

“下载并行”只表示工作可以重叠，不保证请求同时开始，也不保证网络有无限并发。缓存、连接、服务端响应、优先级和主线程忙碌都会改变实际时间。

## 2. parser-inserted script 对照

以下讨论 HTML 中正常声明、由 parser 插入的脚本；动态插入另见第 5 节。

| 写法 | 获取期间 HTML parser | 执行时机 | 标签间顺序 | 与 DOMContentLoaded 的关系 |
| --- | --- | --- | --- | --- |
| 内联 classic | 无外部获取 | 解析遇到时执行 | 按解析位置 | 执行结束才能继续解析 |
| 外部 classic | 在脚本处等待就绪和执行 | 脚本就绪且满足样式表等条件后 | 按解析位置 | 阻塞解析，因而推迟事件 |
| 外部 classic `async` | 继续解析 | 就绪后尽快获得执行机会 | 不保证 | 不作为该事件的等待项 |
| 外部 classic `defer` | 继续解析 | 文档解析结束后执行 | 按文档顺序 | 事件在这组脚本执行之后 |
| 默认 module | 继续解析，获取模块图 | 解析结束、模块图就绪后发起求值 | 入口按文档顺序发起；异步求值需另看依赖 | 等待相应执行步骤；不等于等待所有 TLA 续体 |
| module `async` | 继续解析，获取模块图 | 图就绪后尽快发起求值 | 不保证入口顺序 | 不作为该事件的等待项 |

这是 [HTML script processing model](https://html.spec.whatwg.org/multipage/scripting.html#script-processing-model) 的可观察行为摘要；“尽快”不表示能抢占正在运行的同步 JavaScript。

属性的几个边界：

- 内联 classic 上的 `async`、`defer` 不会改变执行时机。
- 外部 classic 同时声明 `async defer` 时，支持这些属性的现代浏览器走 async 行为。
- module 上 `defer` 没有效果；module 自身已有解析结束后的默认执行模式。
- 内联 module 也走模块处理，可能包含外部 `import`；它不是内联 classic。内联 module 可以使用 `async`。
- `async="false"` 仍然是存在的布尔属性。动态代码要使用 `script.async = false`。

### 普通 classic：parser 等待的是执行完成

```html
<script src="/a.js"></script>
<div id="after"></div>
```

A 可以检查它前面的 DOM，但执行时 `#after` 尚未由 parser 创建。即使 A 已被缓存，仍然需要执行完才能继续解析；把下载变快不能消除同步执行成本。

如果 A 前方有阻塞脚本的样式表，A 还要等样式表就绪。因此看似“HTML 被 CSS 卡住”，实际可能是 `CSS → classic 执行等待 → parser 暂停` 的间接链条。

### async：资源就绪决定资格，主线程决定机会

```html
<script async src="/a.js"></script>
<script async src="/b.js"></script>
```

获取时 parser 可以继续，B 若先就绪便可能先执行。执行开始后，同步 JS 仍会占用主线程；它不能插进另一个脚本正在执行的函数中间。

执行时后方 DOM 可能存在，也可能不存在。不要靠标签位置判断 async 可以访问哪些节点，更不能用 async 为两个有先后依赖的全局脚本提供顺序保证。

### defer：下载可以乱序，执行保持文档顺序

```html
<script defer src="/a.js"></script>
<script defer src="/b.js"></script>
```

B 先下载完成也要等 A。两者执行时，HTML 已解析完成，`document.readyState` 通常为 `interactive`。若 A 同步执行很久，B 与 DOMContentLoaded 都会跟着推迟。

这保证的是这组脚本的执行顺序，不包含它们启动的 `fetch`、定时器或 Promise 所代表的业务完成顺序。

## 3. module：等待的是模块图，而非单个文件

```html
<script type="module" src="/entry.js"></script>
```

```js
// entry.js
import { config } from "./config.js"
console.log(config)
```

浏览器获取入口，解析静态 import，再继续获取依赖，直到相关模块图准备好；发现更深一层依赖可能需要先收到上一层文件，因此“模块图并行加载”不表示所有节点在一开始同时请求。

求值沿依赖关系展开：上例中 config 模块先求值，入口才能使用其导出。循环依赖还涉及 linking 和 live bindings，不能简单套成一条文件队列。

模块的其他必要边界：模块自动使用严格模式，顶层绑定不会像 classic 全局 `var` 那样成为 `window` 属性；跨 origin 获取模块需要 CORS，响应也需要正确的 JavaScript MIME。实验应通过 HTTP 打开，避免 `file://` 导致的加载差异。

这些获取、链接与执行步骤见 [HTML：script processing model](https://html.spec.whatwg.org/multipage/scripting.html#script-processing-model) 和 [模块执行](https://html.spec.whatwg.org/multipage/webappapis.html#run-a-module-script)。

### 顶层 await：入口顺序不等于异步完成顺序

```js
// config.js
export const config = await fetch("/config.json").then((response) => response.json())
```

`await` 挂起 config 的求值，依赖它的 entry 必须等待，独立的另一个模块入口却可以继续。主线程也可以处理其他工作。

这里需要修正“DOMContentLoaded 等所有 module 执行完成”的简写：HTML 的结束解析流程等待默认模块脚本进入相应执行步骤，但模块求值可以返回一个尚未兑现的 Promise；该流程不会把所有顶层 await 的异步完成都当成 DOMContentLoaded 的前置条件。具体关系见 [结束解析](https://html.spec.whatwg.org/multipage/parsing.html#the-end) 和 [运行模块脚本](https://html.spec.whatwg.org/multipage/webappapis.html#run-a-module-script)。

因此，依赖中的 TLA 可能让入口正文在 DOMContentLoaded 之后才运行；不能保证每个默认模块入口正文都已在该事件前执行完。`load` 同样不能代表异步应用初始化完成。需要业务就绪保证时，应显式共享 Promise 或等待 `import()` 返回的 Promise：

```js
async function initialize() {
  const { config } = await import("./config.js")
  startApplication(config)
}
```

`import()` 是运行时触发的模块加载和求值，不会因为写在 defer 脚本里，就自动把它返回的 Promise 加入 DOMContentLoaded 等待条件。

## 4. CSS、DOMContentLoaded 与 load

| 信号或条件 | 表达什么 | 不代表什么 |
| --- | --- | --- |
| `readyState = loading` | HTML 仍在解析 | 所有脚本都没执行 |
| `readyState = interactive` | HTML 解析完成 | defer/module 已全部处理，或业务已就绪 |
| `DOMContentLoaded` | HTML 解析及相关 defer/default module 执行步骤已处理 | 所有图片、async、TLA 续体和业务请求都已完成 |
| `readyState = complete` / `window.load` | 文档及会延迟 load 的依赖资源已完成相应处理 | 懒加载图片、之后发起的请求和所有应用异步工作都已完成 |

DOMContentLoaded 不直接等待普通图片或所有样式表。不过 defer 脚本可能等待阻塞脚本的样式表，事件又等待 defer，于是 CSS 可以间接推迟它。没有受阻脚本时，慢 CSS 可以仍在下载，而 DOMContentLoaded 已触发。

普通、非懒加载图片会延迟 load；async 外部脚本不进入 DOMContentLoaded 的等待列表，但仍可能延迟 load。注册 load 之后才创建的资源，不能倒过来让已触发的 load 再等待一次。生命周期算法见 [HTML：结束解析](https://html.spec.whatwg.org/multipage/parsing.html#the-end)。

async、动态模块或 `await` 之后再注册 DOMContentLoaded 监听时，事件可能已经过去：

```js
function setup() {
  // Initialize DOM-dependent behavior.
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setup, { once: true })
} else {
  setup()
}
```

这段代码用于“DOM 已可访问就初始化”，并非证明其他 defer 脚本或业务初始化完成；若存在业务依赖，应使用显式的依赖协议。

## 5. 动态 script 必须区分创建方式

### createElement 创建的外部 classic

```js
for (const url of ["/a.js", "/b.js"]) {
  const script = document.createElement("script")
  script.async = false
  script.src = url
  document.head.append(script)
}
```

这类外部 classic 默认有 force-async 行为，即使没写 async 属性。插入前设置 `.async = false`，可以让它们并行获取、按插入顺序执行；仅仅 `removeAttribute("async")` 不等价于清除内部 force-async 状态。

它们不是 parser-inserted defer，不会加入解析结束后的 defer 等待列表，也不保证 DOMContentLoaded 之前执行。不要把这条外部 classic 的排序技巧扩展为“所有动态模块异步求值都会依次完成”。相关状态定义见 [HTML：script processing model](https://html.spec.whatwg.org/multipage/scripting.html#script-processing-model)。

### 动态内联 classic 与 innerHTML

```js
const script = document.createElement("script")
script.textContent = "console.log('runs during insertion')"
document.head.append(script)

const container = document.createElement("div")
document.body.append(container)
container.innerHTML = "<script>console.log('does not run')<" + "/script>"
```

前者在插入时执行内联 classic，后者不会执行其中的 script。这解释了为什么“动态脚本都 async”不成立。`document.write` 又可能参与正在进行的 HTML 解析，不应与 DOM API 插入混为一谈。

## 6. 用条件推导执行顺序

回答加载顺序时，按四个问题推导：由谁插入？classic 还是 module？是否有 async/defer？执行还要等哪些条件？再讨论 DOMContentLoaded/load，而不是背一张脱离条件的时间线。

| 追问 | 回答要点 | 对应实验 |
| --- | --- | --- |
| async 不阻塞解析，为什么页面还会卡？ | 获取不阻塞，不代表同步执行不占用主线程 | async + `work` |
| B 已下载完为什么没执行？ | 可能等待 classic 解析位置、defer 顺序、样式表或模块依赖 | classic / defer / css / module |
| defer 一定比 async 晚吗？ | 不存在跨模式固定顺序；看解析结束和各自就绪时间 | 调整 A/B/tail |
| module 是否就是 defer？ | 默认时机相似，但还有模块图、模块作用域和异步求值 | module / tla |
| DOMContentLoaded 是否代表模块初始化完成？ | TLA、动态 import 和业务异步任务需要显式等待 | tla |
| 动态脚本怎么保持先后？ | 外部 classic 插入前 `.async = false`；模块依赖用 import 表达 | dynamic-ordered |
| preload 是否提前执行 JS？ | 它提前获取资源；执行仍由消费端决定 | hints 对照 |

Network 用于看请求发现、响应与缓存；Console/页面日志用于看执行和事件；Performance 用于看主线程执行成本和渲染。不同面板的证据不能互相替代。完整操作与实际观察见 [实验说明](./experiment.md)。
