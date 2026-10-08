# 页面生命周期：加载、后台、离开与恢复

[实验入口](./README.md) · [实验走查](./index.md) · [History 与导航](./history.md)

页面完成加载之后，还可能隐藏、冻结、进入 BFCache，或被浏览器丢弃。理解生命周期的目的，是在能运行时保存必要状态，在恢复时重新判断数据是否仍然有效。

下文代码摘自 [index.ts](./index.ts) 中嵌入页面的浏览器脚本，省略 UI 渲染和重复日志。`record` 记录真实事件，`checkpoint` 保存草稿，`syncPolling` 根据页面状态启停应用轮询；完整辅助函数、错误处理与操作入口见[实验走查](./index.md)。

## 加载完成只描述文档准备程度

`document.readyState` 与页面是否可见、是否仍保留在内存中是不同维度。

| readyState    | 含义                                 | 常见观察点                                                                       |
| ------------- | ------------------------------------ | -------------------------------------------------------------------------------- |
| `loading`     | HTML 仍在解析                        | 前部同步脚本可能还访问不到后部 DOM                                               |
| `interactive` | HTML 解析结束                        | defer / 默认 module 可能仍在准备或执行，不能只靠该值认定 DOMContentLoaded 已触发 |
| `complete`    | 文档及会延迟 load 的资源完成加载阶段 | 随后触发 window 的 load；失败资源也可能结束等待                                  |

`readystatechange` 通知 readyState 变化；`DOMContentLoaded` 关注 DOM 解析及相关延迟脚本；`load` 还等待会阻塞它的资源。懒加载资源、后续 fetch、定时器及业务初始化不在“所有工作完成”的保证内。顶层 await 还需区分模块开始执行与异步求值完成，详见 [script 加载笔记](../loading/scriptLoading.md)。这些阶段由 [HTML 文档解析与加载算法](https://html.spec.whatwg.org/multipage/parsing.html#the-end) 定义。

`complete` 的页面切到后台仍然可以保持 `complete`；从 BFCache 恢复也不会为了展示而重新触发 DOMContentLoaded 和 load。SPA 的路由切换通常不创建新 Document，应另外跟踪应用路由状态；pushState、hash 与文档导航的对照见 [History](./history.md)。

demo 在页面前部安装监听，并用执行身份区分新文档：

```js
const executionId = crypto.randomUUID()
record("script start", executionId)
document.addEventListener("readystatechange", () => record("readystatechange"))
document.addEventListener("DOMContentLoaded", () => record("DOMContentLoaded"))
window.addEventListener("load", () => record("load"))
```

记录同时包含当前 `document.readyState`；源码在 DOMContentLoaded 中恢复草稿并绑定按钮，而不是在所有事件里重复初始化。

## 展示与离开：pageshow / pagehide

| 事件                      | 对象   | 关键含义                                                          |
| ------------------------- | ------ | ----------------------------------------------------------------- |
| `pageshow`                | window | 文档初次展示或历史记录恢复；初次通常在 load 后，`persisted=false` |
| `pagehide`                | window | 离开当前文档，包括可能被保存进 BFCache 的离开                     |
| `pageshow.persisted=true` | window | 实际从 BFCache 恢复                                               |
| `pagehide.persisted=true` | window | 浏览器打算保留文档；后续仍可能淘汰，不能据此保证能恢复            |

BFCache 保留页面的 DOM 和 JavaScript 堆等状态，恢复时接着使用原文档。HTTP 缓存复用的是资源响应，即使资源全来自缓存，新文档也需要重新执行初始化。更完整的对比见 [BFCache](./bfcache.md)；事件语义见 [HTML PageTransitionEvent](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-pagetransitionevent-interface)。

实验用三个证据共同判断：`pageshow.persisted`、本次执行生成的 `executionId`、没有持久化的计数。草稿恢复本身不能证明 BFCache 命中，因为新文档也能从 sessionStorage 读取它。

恢复后要重新核对时间、身份与业务数据：缓存期间会话可能过期，库存可能变化，连接也可能失效。BFCache、可见性和冻结实验在 pageshow 时获取新的服务端时间；业务中应按有效期刷新数据，并用幂等初始化避免重复注册监听或创建轮询。

对应 demo 的恢复与离开分支：

```js
window.addEventListener("pageshow", (event) => {
  record("pageshow", "persisted=" + event.persisted)
  frozen = false
  syncPolling()
  void refreshServerTime(event.persisted ? "BFCache 恢复" : "新文档展示")
})
window.addEventListener("pagehide", (event) => {
  record("pagehide", "persisted=" + event.persisted)
  checkpoint("pagehide")
  if (pollingTimer !== null) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
})
```

`refreshServerTime` 重新 fetch `/api/state`；它的请求不意味着整个文档重新加载。

## 可见性与焦点：什么时候主动减少工作

`document.visibilityState` 通常为 `visible` 或 `hidden`，变化通过 document 上的 `visibilitychange` 通知。切换标签、最小化等可能让文档隐藏。`document.hasFocus()` 和 window 的 focus / blur 描述焦点：页面可见但没有焦点时，不等于隐藏。可见性由浏览器判断，不能用它证明用户真的阅读了内容。定义见 [HTML Page Visibility](https://html.spec.whatwg.org/multipage/interaction.html#page-visibility)。

hidden 是尽早保存小型检查点和统计的实用时机，也适合暂停轮询、动画等非必要工作；返回 visible 时再恢复并更新数据。它不是“会话永久结束”的信号：用户可能很快返回。事件也无法覆盖突然断电或进程直接终止，因此持续编辑应提前保存，不能把全部数据留到离开那一刻。

浏览器可能在后台节流 timer，通常会暂停后台页面的 requestAnimationFrame；具体频率受浏览器、可听音频、资源预算等条件影响。应用自己停止轮询与浏览器节流是两件事。实验分别展示原生 timer/rAF 计数及应用主动暂停的轮询计数。倒计时应根据目标时间与当前时间的差值重算，不能假设每次 setInterval 回调都准确代表一秒。

对应 demo 的 visibilitychange 与轮询条件，示例省略计数渲染：

```js
function syncPolling() {
  const shouldPoll =
    ["visibility", "freeze"].includes(mode) && document.visibilityState === "visible" && !frozen
  if (shouldPoll && pollingTimer === null) {
    pollingTimer = setInterval(() => {
      pollingTicks++
    }, 1000)
  } else if (!shouldPoll && pollingTimer !== null) {
    clearInterval(pollingTimer)
    pollingTimer = null
  }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") checkpoint("hidden")
  else void refreshServerTime("重新可见")
  syncPolling()
})
```

这里的 `mode` 是当前实验主题，`frozen`、`pollingTimer` 和 `pollingTicks` 是页面内状态；timer/rAF 对照计数另行记录；这些工作只在对应主题路由中启用。

## 冻结、丢弃与终止

下面采用 Chromium 文档中的状态模型，帮助理解运行机会；它不是所有浏览器统一提供的状态枚举。

| 状态       | 页面还能做什么                         | 恢复时如何判断                                     |
| ---------- | -------------------------------------- | -------------------------------------------------- |
| hidden     | 仍可能运行，但受后台策略限制           | visibilitychange 到 visible                        |
| frozen     | 可冻结任务暂停，不能依赖定时器继续执行 | 支持的 Chromium 可观察 document 的 freeze / resume |
| discarded  | 原文档被释放，没有机会执行“丢弃回调”   | 新文档加载；支持时查看 document.wasDiscarded       |
| terminated | 文档被终止，不能继续安排可靠工作       | 再访问一般需要新文档                               |

不是每次隐藏都会冻结，也不是每次冻结都会丢弃。BFCache 与冻结有关，但收到 freeze 不等于命中 BFCache；恢复身份仍看 pageshow.persisted。应检测扩展属性，缺失时提供常规恢复路径。Chromium 的实现说明及调试方法见 [Page Lifecycle API](https://developer.chrome.com/docs/web-platform/page-lifecycle-api)。

丢弃后的恢复需要依靠已保存的状态。实验把草稿备份进本标签 sessionStorage，重建后可读回，但该存储可能被限制，标签关闭等也不属于持久业务保证。重要草稿可结合 [IndexedDB](../../storage/indexedDB/README.md) 与服务端同步，明确“已备份”“待同步”“已确认”的边界。

对应 demo 的 Chromium 扩展事件监听：

```js
document.addEventListener("freeze", () => {
  frozen = true
  record("freeze")
  checkpoint("freeze")
  syncPolling()
})
document.addEventListener("resume", () => {
  frozen = false
  record("resume")
  syncPolling()
})
record("discard check", "wasDiscarded=" + document.wasDiscarded)
```

最后一行是启动阶段的诊断写法；不支持 `wasDiscarded` 时应视为未知，而不是“未丢弃”。

## 离开提示不是保存机制

`beforeunload` 用于有未保存修改时请求浏览器提示用户。仅当 dirty 状态需要保护时注册，保存后立即移除。对话框通常需要先发生用户交互，提示文字由浏览器控制；触发、展示及 BFCache 影响有实现差异。

`unload` 在移动端、后台杀进程等情况下不可靠，监听还可能影响 BFCache，不能作为关键保存或上报入口。`pagehide` 同样不是进程终止必达通知。相关约束见 [HTML 文档卸载算法](https://html.spec.whatwg.org/multipage/browsing-the-web.html#unloading-documents)。

实验默认不注册 beforeunload，也不注册 unload。勾选提醒并编辑后才增加 beforeunload，确认本地草稿后移除。输入时持续备份、hidden/pagehide 时再写检查点，与离开提醒分开。实验的 dirty 标记仅在当前文档内保存，刷新后重置，真实业务应持久化版本与同步状态。

demo 的 `syncWarning` 根据用户勾选和 dirty 状态增删监听；核心流程如下：

```js
function beforeLeave(event) {
  event.preventDefault()
  event.returnValue = ""
}
function syncWarning() {
  const needed = warningEnabled && dirty
  if (needed && !warningAttached) {
    window.addEventListener("beforeunload", beforeLeave)
  } else if (!needed && warningAttached) {
    window.removeEventListener("beforeunload", beforeLeave)
  }
  warningAttached = needed
}
```

输入时将 dirty 置为 true 并备份，用户确认本地草稿成功后置为 false，再调用 `syncWarning`。提醒开关本身不执行保存。

## 离页上报：入队、送达与业务确认

| 方式                                   | 适用场景                         | 能观察什么                                             |
| -------------------------------------- | -------------------------------- | ------------------------------------------------------ |
| `navigator.sendBeacon(url, body)`      | 小型统计，POST，不需要读取响应   | 返回 boolean 表示是否入队，没有响应回调                |
| `fetch(url, { keepalive: true, ... })` | 需要自定义请求方法、头或读取响应 | 页面仍能执行时可处理 Promise；离开后不能依赖原页面回调 |

两者允许请求在页面离开后继续处理，但都不是离线重试队列，更不是业务必达承诺。Beacon 返回 true 不能证明服务器已接收，依据是 [Beacon 的返回值与处理模型](https://w3c.github.io/beacon/#return-value)。

keepalive 请求存在大小和在途配额限制，Beacon 也使用相关机制；不能把多个小请求无限累加。Fetch 标准的相关在途 body 总量检查使用 64 KiB，适用的 fetch group 与请求完成情况也影响能否提交，见 [Fetch HTTP-network-or-cache fetch](https://fetch.spec.whatwg.org/#http-network-or-cache-fetch)。本实验只发少量元数据，本地接口另设 8 KiB 的请求体上限，与浏览器配额不是同一个限制。

实验分别记录客户端 accepted、HTTP 请求响应和服务端接收列表。生产业务若要求可靠提交，还需要持久化、确认、重试与幂等；不能靠阻塞卸载来获得可靠性。

对应 demo 的两条上报路径，`makeReport` 只编码实验元数据：

```js
const accepted = navigator.sendBeacon("/api/report", makeReport("manual-beacon"))
record("sendBeacon", "accepted=" + accepted + "；需另查服务端接收记录")

const response = await fetch("/api/report", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: makeReport("manual-keepalive"),
  keepalive: true,
})
if (!response.ok) throw new Error("HTTP " + response.status)
record("keepalive fetch", "收到 HTTP " + response.status)
```

完整代码分别放在按钮处理函数中，并捕获异常；页面通过另一次 `/api/reports` 查询核对服务端记录。

## 面试时如何组织回答

| 问题                                           | 回答重点                                                 |
| ---------------------------------------------- | -------------------------------------------------------- |
| load 后页面生命周期结束了吗？                  | 只是加载阶段结束，仍有可见性、隐藏、恢复和终止           |
| 页面返回为什么没触发 load？                    | 可能从 BFCache 恢复；用 pageshow.persisted 判断          |
| pagehide.persisted=true 能保证后退快速恢复吗？ | 不能，页面可能被淘汰                                     |
| 切后台要保存什么？                             | 提前保存可恢复的小型状态，暂停非必要工作，恢复时核验时效 |
| 能在 discard / unload 时做最后保存吗？         | discard 没有原页面回调；unload 也不能保证触发            |
| Beacon true 是上报成功吗？                     | 仅入队，需要服务端记录或业务确认才能判断后续结果         |
