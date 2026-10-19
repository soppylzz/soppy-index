# History、Location 与同文档路由

历史记录包含导航位置及关联状态，不能理解成简单的 URL 字符串数组。同一个 Document 可以对应多个历史条目；不同 Document 也可能使用相同 URL。区分这两种情况，才能判断为什么有时后退只更新视图，有时重新初始化，有时恢复旧堆。

## 1. 先分清导航与历史条目

| 操作 | 当前条目如何变化 | 是否创建新 Document | 主要观察 |
| --- | --- | --- | --- |
| `location.assign(url)` / 普通链接 | 通常新增并激活目标条目 | 完整文档导航时会；只变 fragment 可保持同文档 | 新加载事件，或同文档 hash 事件 |
| `location.replace(url)` | 目标替换当前条目 | 取决于目标是否为同文档导航 | 后退跳过被替换位置 |
| `location.reload()` / `history.go(0)` | 重新加载当前位置 | 通常创建新文档，不是 BFCache 恢复 | 新 executionId 与加载流程 |
| `history.pushState(state, '', url)` | 新增并激活同文档条目 | 不创建 | URL / state 立即更新，应用主动渲染 |
| `history.replaceState(state, '', url)` | 更新当前同文档条目 | 不创建 | URL / state 更新，不增加条目 |
| `history.back()` / `forward()` / `go(delta)` | 遍历到已有条目 | 可能同文档、恢复旧文档或重建 | popstate、pageshow 与执行身份共同判断 |

这里是简化的学习模型；会话历史遍历还涉及嵌套上下文与浏览器维护的状态，完整算法见 [HTML History 接口](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-history-interface)。`history.length` 不是当前游标，也不能列出历史 URL；其中可能有进入实验前的条目。遍历超出可用范围时可能没有效果，接口也不返回完成 Promise。

`assign` 与 `replace` 的区别在条目处理，不是“一个可以跨源、一个不可以”；合法导航仍受上下文权限、sandbox 和浏览器策略影响。见 [Location.assign](https://developer.mozilla.org/en-US/docs/Web/API/Location/assign) 与 [Location.replace](https://developer.mozilla.org/en-US/docs/Web/API/Location/replace)。

## 2. pushState / replaceState：改地址不等于渲染

这两种调用本身不会立即获取新文档，也不会触发 popstate。即使只改 hash，也不会因调用本身触发 hashchange。源码中的按钮在调用返回后主动更新 UI；后退则由真实事件回调恢复视图。

以下为 [index.ts](../lifecycle/demo/lib/handler.ts) 的 `setupHistory` 核心流程节选，`record` 和 `renderRoute` 是页面辅助函数：

```js
history.pushState({ view: "a", step: ++sequence }, "", "/history/view/a")
renderRoute()

history.replaceState({ view: "b", step: ++sequence }, "", "/history/view/b")
renderRoute()

window.addEventListener("popstate", (event) => {
  record("popstate", "state=" + JSON.stringify(event.state))
  renderRoute()
})
```

假设当前为 H，push A 后变为 H、A；replace B 后是 H、B，而非 H、A、B。因此后退到 H，再前进到 B。真实浏览器里的 length 可能已有其他历史条目，实验比较的是相对变化。

第二个参数使用空字符串；URL 必须符合当前文档的重写约束，普通 HTTP 页面要求同源。state 按结构化序列化保存，函数等不可序列化值抛 DataCloneError，不是共享对象引用。浏览器还可能限制状态大小和调用频率，不应存放大数据或敏感凭证。细节见 [MDN pushState](https://developer.mozilla.org/en-US/docs/Web/API/History/pushState)。

demo 提供两条拒绝路径：把 URL 的 host 从 localhost 换为 127.0.0.1，或反过来，触发跨源 SecurityError；state 含函数触发 DataCloneError。拒绝不会执行 UI 跳转。失败名字写在实际 catch 中，不是预先填入日志。

## 3. popstate 与 hashchange 不是同一件事

| 操作 | popstate | hashchange |
| --- | --- | --- |
| 直接 pushState / replaceState | 调用本身不触发 | 调用本身不触发，即使 URL 含新 hash |
| `location.hash` 设为不同 fragment | 是否发生 popstate 取决于遍历及条目 state 变化，不能仅凭 hash 改变推断 | fragment 改变时触发 |
| 设为完全相同 hash | 不因无变化调用而新增对应事件 | 没有变化就不触发 |
| 后退 / 前进 | 需依据实际条目切换与 state 激活判断 | 遍历还改变 fragment 时可能触发 |

不要把 popstate 等同于“点击浏览器后退”，也不要假设每次文档展示都会有 popstate。用户交互限制、首次加载差异和实际历史条目都会影响观察。`event.state` 可以为 null；URL 已改变也不意味着路由器完成了渲染。见 [popstate 事件](https://developer.mozilla.org/en-US/docs/Web/API/Window/popstate_event) 与 [hashchange 事件](https://developer.mozilla.org/en-US/docs/Web/API/Window/hashchange_event)。

对应实验里的两种改 hash 方式：

```js
history.pushState({ view: "state-hash" }, "", "#state-hash")
renderRoute()

location.hash = "hash-1"
window.addEventListener("hashchange", (event) => {
  record("hashchange", event.oldURL + " → " + event.newURL)
  renderRoute()
})
```

完整实现为 hash 每次生成新值，并单独提供“重复当前 hash”按钮。`renderRoute` 从 URL 读取视图，将 URL、history.state、length 和真实事件计数写入 textContent；不通过 dispatchEvent 模拟浏览器事件。

## 4. hash 路由与 history 路由的服务端区别

fragment 不随 HTTP 请求发送。例如 `/history#hash-1` 直接打开或刷新，服务器收到的是 `/history`；应用仍须能加载这个基础入口。hash 并非完全没有服务端条件。

history 路由把路径放在 URL 中，例如 `/history/view/a`。pushState 当时不请求新文档，但刷新、粘贴地址访问或会话重建时会请求该路径，服务器必须提供对应应用入口。不能把所有未知 API 和静态文件都回退成 HTML，否则脚本 MIME 和错误诊断会被破坏。

本服务只对两个明确子路径返回 History 页面，其他未知路径仍为 404。路由分支简化如下：

```ts
if (path === "/history/view/a" || path === "/history/view/b") {
  send(200, "text/html; charset=utf-8", page("history"), "no-cache")
}
```

`send`、`page` 来自 [index.ts](../lifecycle/demo/lib/handler.ts)；入口加载后根据当前 pathname / hash 恢复 UI。state 未必存在，因此刷新子路径的渲染不能只依赖此前内存里的路由状态。

## 5. Location 对照代码

`/navigation` 使用不同目标路径，避免把 fragment 导航混入文档重建对照：

```js
location.assign("/navigation/target?via=assign")
```

另一次独立实验改为：

```js
location.replace("/navigation/target?via=replace")
```

先从 `/loading` 打开 `/navigation`，再执行其中一种操作。目标页点击 back：assign 可以回到操作页；replace 跳过被替换的操作页，返回先前 `/loading`。先记下入口路径，不要仅凭 length 判断。导航后旧页的回调不保证继续运行，应在目标页和恢复页观察。

reload 与 `go(0)` 各提供独立按钮，观察新的 executionId。普通导航同 URL 是否重载、是否成为 replacement 还涉及具体算法，不能拿这组固定目标的观察推广到全部导航。

## 6. 与生命周期和 BFCache 的衔接

同文档 pushState / hash 变化不重新触发 DOMContentLoaded 或 load，也不因为视图切换就等同于页面离开。SPA 应管理自己的路由数据、监听与组件清理；不能等 pagehide 替代视图卸载。

跨文档历史遍历可能触发 BFCache 恢复，也可能重新加载。后退很快、草稿还在、URL 一样，都不足以证明 BFCache；还要看 `pageshow.persisted`、执行 ID 与初始化事件，详见 [BFCache](../lifecycle/bfcache.md)。两种情况均需重新核验时效敏感的数据。

浏览器还可能恢复滚动和表单等状态。需要应用接管滚动时可考虑 `history.scrollRestoration = 'manual'`，并自行记录/恢复位置；它不是恢复整个应用状态的机制，兼容和用途见 [scrollRestoration](https://developer.mozilla.org/en-US/docs/Web/API/History/scrollRestoration)。本模块没有滚动恢复的实测实验。

## 7. 阅读与实验顺序

先运行 `/loading` 确认新文档加载与 ID，再用 `/history` 对照同文档记录，最后比较 `/navigation` 和 `/bfcache`。页面上的“调用返回”、真实事件与 HTTP 请求属于三类证据；规范结论、浏览器策略和实测记录在[实验走查](./experiment.md)中分别说明。
