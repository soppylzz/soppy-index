# Script Loading 实验走查

本实验让真实浏览器负责 HTML 解析、模块加载与脚本执行；Node 服务只提供 HTML、资源和可控响应延迟。运行方式见 [README](./README.md)，理论见 [Script Loading](./scriptLoading.md)。

公共模块迁移后的知识 / demo 对应复核与实际运行记录见[集中验证](../../../demo/validation.md)；下方早期记录保留各自的环境与覆盖边界。

## 1. 如何读日志

先查看启动时的 CLI 引导，选择实验入口并按提示操作。终端随后打印 HTTP 请求、响应状态和脚本响应延迟；页面与浏览器 Console 记录 JS 执行、DOM 标记和生命周期事件。请求到达服务端不代表脚本已经执行。

```text
  906.2ms | interactive | after=true | DOMContentLoaded
```

- 时间来自 `performance.now()`，相对当前文档的时间原点，不是服务端请求计时。
- `readyState` 是该行记录时的文档状态。
- `after` 表示 parser 是否已创建脚本标签后方的 `#after` 节点。
- `after marker observed` 由 head 中注册的 MutationObserver 记录；表示观察回调已看到标记，不是 HTML EOF 或首次 Paint 的精确时间。

早期日志先存入数组，DOM 出现后写入页面，同时始终写入 Console。观察代码安装在实验 CSS 与脚本之前；普通实验尾部没有额外内联日志脚本，避免它等待 CSS、反过来改变被测流程。

## 2. 实验清单

默认 A 响应延迟 900ms，B 为 100ms，HTML 尾部在 500ms 后发送；各延迟从对应请求或文档响应开始计。module 的 A/B 参数控制静态依赖响应。实验使用 HTTP `no-store`，预扫描仍可能提前发起后方资源的请求。

| mode              | 操作                                   | 默认参数下应重点观察                                                     |
| ----------------- | -------------------------------------- | ------------------------------------------------------------------------ |
| `classic`         | 比较 A/B 与后方标记                    | A、B 顺序执行，执行时 `after=false`；下载完成顺序不能决定执行顺序        |
| `inline`          | 看内联 A、B                            | 无外部下载；内联 classic 的 async/defer 不改变遇到即执行                 |
| `async`           | 对比 B、A、DOMContentLoaded            | B 通常在 `loading` 阶段先执行；A 通常在 DOMContentLoaded 后执行          |
| `defer`           | 查看 Network 中 B 先完成，再看执行日志 | A、B 在 `interactive` 阶段按文档顺序执行，随后 DOMContentLoaded          |
| `module`          | 查看入口与 dependency 请求/日志        | 模块图准备好后，依赖先求值、入口后执行；入口按文档顺序发起               |
| `async-module`    | 比较两张模块图的就绪时间               | B 图更早就绪，通常先执行；模块图就绪不是仅入口文件下载完                 |
| `tla`             | 留意 load 之后是否仍追加日志           | A 依赖 await 挂起，B 与 DOMContentLoaded 继续；A 入口在依赖恢复后执行    |
| `dynamic`         | 查看 append 时打印的 async 值          | 默认 `async=true`；B 通常先执行                                          |
| `dynamic-ordered` | 与上一组比较                           | `async=false`，A、B 按插入顺序执行，DOMContentLoaded 可以先触发          |
| `innerhtml`       | 比较插入前、插入后和脚本日志           | innerHTML 中脚本不执行；动态内联 classic 在 append 前后两条日志之间执行  |
| `css-only`        | Network 看 CSS 尚未完成时的日志        | 标记、interactive 与 DOMContentLoaded 可先出现，CSS 不直接阻塞 HTML 解析 |
| `css`             | 看脚本下载完成与执行开始之间的空档     | classic 等前方 CSS，parser 又等 classic，后方标记迟到                    |
| `css-defer`       | 与 css 比较后方标记时间                | DOM 可先解析；defer 等 CSS，DOMContentLoaded 随后触发                    |

每个普通页面包含一张延迟 1600ms 响应的图片。图片请求并不从文档导航的 0ms 同时开始，因此 load 不能简单读成“必然在第 1600ms”。

## 3. 调整参数验证因果

### 就绪时间与解析时间

访问 `/experiment?mode=async&a=100&b=900&tail=1500`：两份脚本可以在 HTML 尾部到达前执行，`after=false`。再把 `tail` 改成 0，观察 DOM 是否更早可用。竞争顺序受本次调度影响，结论应建立在条件变化上。

访问 `/experiment?mode=defer&a=900&b=100&tail=1500`：即使两个文件都已到达，仍要等 HTML 解析结束。把 tail 改回 500，等待项又主要变成 A 的响应。

### 获取不阻塞，不代表执行不占用主线程

访问 `/experiment?mode=async&a=100&b=200&tail=500&work=700`，同时录制 Performance。每个 classic 在 start/end 之间同步忙循环 700ms；B 即使响应已到，也不能抢占 A 当前的同步执行，HTML 尾部解析和事件分发也可能推迟。

不要把 `work` 当网络延迟：它发生在浏览器执行阶段；`a/b` 发生在服务端响应阶段。忙循环只用于展示执行成本，不作为业务代码示例。

### CSS 的直接与间接影响

分别打开 `css-only`、`css`、`css-defer`，保持 `css=1300&tail=500`：

1. css-only 的标记和 DOMContentLoaded 约在尾部到达后出现，CSS 此时仍在下载。
2. css 的 classic 等 CSS 后才执行，执行时标记还不存在。
3. css-defer 的标记先出现，脚本和 DOMContentLoaded 等到 CSS 就绪。

这些日志说明 DOM 构建与脚本时机，不能当作首帧测量。要观察 CSS 对首次渲染的影响，需另看 Performance 的截图和绘制记录。

## 4. Chrome 实际观察

以下片段来自 2026-10-08 本机 Chrome 153.0.8010.48 的 headless 验证，均使用默认参数。它们是一次运行的记录，省略部分行，毫秒数不构成规范保证。Firefox、Safari 尚未执行本次自动化验证。

### defer：B 先下载，仍按 A、B 执行

```text
    3.3ms | loading     | after=false | head bootstrap
  504.0ms | loading     | after=true | after marker observed
  905.8ms | interactive | after=true | classic A: start
  905.9ms | interactive | after=true | classic A: end
  906.0ms | interactive | after=true | classic B: start
  906.1ms | interactive | after=true | classic B: end
  906.2ms | interactive | after=true | DOMContentLoaded
 2110.3ms | complete    | after=true | window.load
```

HTML 尾部的标记先出现，说明没有等待 A 下载才继续构建 DOM；A、B 执行时为 interactive，随后才触发 DOMContentLoaded。图片继续推迟 load。

### async：B 与 A 分别落在 DOMContentLoaded 两侧

```text
    7.9ms | loading     | after=false | head bootstrap
  110.5ms | loading     | after=false | classic B: start
  110.6ms | loading     | after=false | classic B: end
  504.8ms | loading     | after=true | after marker observed
  506.6ms | interactive | after=true | DOMContentLoaded
  910.4ms | interactive | after=true | classic A: start
  910.4ms | interactive | after=true | classic A: end
 2107.3ms | complete    | after=true | window.load
```

B 执行时后方节点不存在，A 执行时已存在。async 不提供统一的 DOM 就绪条件。

### 顶层 await：DOMContentLoaded、load 均早于 A 入口完成

```text
    5.5ms | loading     | after=false | head bootstrap
  505.4ms | loading     | after=true | after marker observed
  910.2ms | interactive | after=true | dependency A: start
  910.3ms | interactive | after=true | dependency B: start
  910.4ms | interactive | after=true | module entry B
  910.4ms | interactive | after=true | DOMContentLoaded
 2110.6ms | complete    | after=true | window.load
 2311.5ms | complete    | after=true | dependency A: resumed after await
 2311.8ms | complete    | after=true | module entry A
```

这里 B 是独立入口，能在 A 依赖挂起时执行；A 入口必须等依赖恢复。load 已触发后页面仍有新的日志，所以不能用它替代应用就绪协议。

### 慢 CSS 对照

| 模式      | 首次看到后方标记 | DOMContentLoaded |
| --------- | ---------------- | ---------------- |
| css-only  | 504.4ms          | 505.0ms          |
| css       | 1311.1ms         | 1313.9ms         |
| css-defer | 503.3ms          | 1311.6ms         |

css-only 的 DOMContentLoaded 明显早于 CSS 的 1300ms 响应延迟；css-defer 的 DOM 虽先出现，DOMContentLoaded 却随脚本一起等待。

## 5. preload / modulepreload 对照

首页提供两组链接，每组都比较 `hint=none` 与匹配 hint。实验分两块发送 HTML：head 立即发送，消费 script 所在的尾部 600ms 后发送。这使请求发现时机成为明确变量。

在 Network 中取消 Disable cache，检查入口请求的开始时间、Initiator 和数量。每次导航的入口 URL 唯一；同次导航的 hint 与 script URL 相同，入口响应允许缓存复用。

本次 Chrome 观察中，classic 入口请求从无 hint 的约 605ms 提前到有 preload 的约 6ms；module 入口也从约 605ms 提前到 modulepreload 的约 7ms。同次导航中每个入口均只出现一次网络请求。精确结果以当次 Network 为准。

hint 不直接执行代码：实际入口日志仍由后方 script 消费产生。modulepreload 是否提前获取依赖以及 Initiator 显示名称属于实现观察，不能要求所有浏览器都使用同一种面板标签。

## 6. 验证范围

本次检查覆盖 13 种 script/CSS 模式和 4 个 hint 对照页面：页面正常 load，无脚本错误或未处理拒绝；检查了 classic/defer 顺序、DOM 可用状态、async 反序、动态排序、innerHTML 不执行，以及 TLA 依赖恢复与入口执行关系。提示页检查了匹配入口没有重复网络请求。

HTTP、格式和类型检查用于验证服务和文件基本正确；执行顺序来自真实 Chrome，而非 Node 模拟。实验未覆盖跨 origin CORS、失败重试、循环依赖、所有资源优先级策略与跨浏览器兼容性。这些条件不应从当前演示自动外推。
