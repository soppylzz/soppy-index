# Back/Forward Cache（BFCache）

BFCache 在用户离开页面时，尝试保存完整页面及其 JavaScript heap、DOM 和运行状态；用户通过浏览器前进或后退返回时，可以直接恢复快照。它优化的是历史导航，不是普通刷新，也不是 HTTP response 的缓存。

## 1. 与 HTTP cache 的区别

| 对比项       | BFCache                        | HTTP cache                   |
| ------------ | ------------------------------ | ---------------------------- |
| 保存对象     | 整个页面运行状态               | 单个 HTTP response           |
| 主要触发场景 | 前进、后退                     | 导航和资源请求               |
| 恢复结果     | 原页面继续运行                 | 用缓存 response 重新构建页面 |
| 应用控制     | 浏览器决定是否存入；页面可适配 | HTTP 头可明确控制复用规则    |

如果页面没有进入 BFCache，后退导航仍可能借助 HTTP cache 加快资源加载，但页面会重新执行初始化流程。这两种情况在用户感受上可能接近，生命周期却不同。

## 2. pageshow 与 pagehide

使用 `pageshow` / `pagehide` 观察页面被恢复或离开。`pageshow.persisted=true` 表示实际从 BFCache 恢复；`pagehide.persisted=true` 表示浏览器打算保留页面，但后续可能淘汰，不能保证恢复：

```js
window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    refreshTimeSensitiveData()
  }
})

window.addEventListener("pagehide", (event) => {
  if (event.persisted) {
    pauseTransientWork()
  }
})
```

BFCache 恢复后，内存中的数据可能已经过时。例如库存、登录状态和协作数据都可能在页面冻结期间改变。应在 `pageshow` 的 BFCache 分支中重新验证时效性强的数据，而不是无条件重建整个应用。

更完整的页面状态转换见 [页面生命周期](./page-lifecycle.md)。

## 3. 不要依赖 unload

`unload` 在移动端等场景本来就不可靠，并会影响一些浏览器对 BFCache 的判断。需要保存状态或暂停工作时，优先使用 `visibilitychange`、`pagehide` 等生命周期信号，并让保存操作可重复执行。

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    saveDraftLocally()
  }
})
```

不要把“收到某个离开事件”当成数据已经成功上传的保证。关键数据应尽早保存到合适的本地存储，网络同步则设计重试机制。

## 4. 可恢复性由浏览器决定

页面是否进入 BFCache 取决于浏览器实现、页面使用的 API、响应策略和当时资源状况。某些阻碍因素可以由页面修复，另一些则是浏览器策略或资源压力造成的。

因此应遵循两条原则：

- 正确性不能依赖一定命中 BFCache；正常重载路径也必须工作。
- 不要维护一张永远不变的“禁用 API 清单”，应以目标浏览器当前文档和 DevTools 诊断为准。

Chromium 在支持的环境中提供 `PerformanceNavigationTiming.notRestoredReasons`，用于解释主文档为何没有从 BFCache 恢复：

```js
const [navigationEntry] = performance.getEntriesByType("navigation")

if (navigationEntry?.type === "back_forward") {
  if ("notRestoredReasons" in navigationEntry) {
    console.log(navigationEntry.notRestoredReasons)
  }
}
```

该诊断接口不能作为业务逻辑依赖，并且兼容性有限；使用前应进行能力检测。

## 5. 测试方法

1. 打开页面并产生一些可观察状态，例如输入未提交文本。
2. 点击同标签页内的链接离开，再使用浏览器后退。
3. 检查输入状态是否恢复，并在 `pageshow` 中记录 `event.persisted`。
4. 在 Chromium DevTools 的 Application 面板运行 Back/forward cache 测试，查看阻碍原因。
5. 同时测试未命中后的完整初始化路径。

开发者工具本身、扩展和打开的连接可能影响测试结果，应尽量在接近真实用户的环境复核。

## 6. 可运行 Demo

[同目录的生命周期实验](demo/lib/handler.ts) 提供历史导航对照，运行：

```bash
pnpm --filter lifecycle-next-lab dev
```

打开默认 <http://localhost:5006/bfcache>，观察执行 ID、内存计数、草稿与真实事件：

1. 输入草稿，记下 executionId 和计数，从 BFCache 页前往 `/between?from=/bfcache`，再通过历史记录后退。
2. `pageshow.persisted=true` 且执行 ID 保持，说明原文档恢复；本轮不会重新触发 DOMContentLoaded/load。
3. 再刷新或通过中转页的普通链接返回，对比执行 ID 改变、初始化重新发生。草稿仍可能从 sessionStorage 读回，因此草稿保留本身不能证明命中。
4. 恢复后实验会请求新的服务端时间，网络仍可能出现请求；不能用“终端零请求”定义 BFCache 命中。

本实验不注册 unload；离开提醒使用仅在待确认修改时注册的 beforeunload。DevTools 与浏览器策略可能影响资格，应结合诊断工具复核，完整步骤和实际验证见 [实验走查](./experiment.md)。

## 7. 兼容性

主流浏览器支持 BFCache，但可缓存条件和具体实现不同。`pageshow`、`pagehide` 的兼容性较好；`notRestoredReasons` 需要单独检测。详见 [MDN：bfcache](https://developer.mozilla.org/en-US/docs/Glossary/bfcache)、[MDN：pageshow](https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event#browser_compatibility) 和 [MDN：notRestoredReasons](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming/notRestoredReasons#browser_compatibility)。

## 8. 面试回答框架

先说明 BFCache 保存的是页面快照，只服务于前进/后退；再用 `pageshow.persisted` 解释恢复检测；最后说明页面恢复后要重新验证时效数据，而且命中与否由浏览器决定。若追问与 HTTP cache 的区别，强调后者保存 response，页面仍可能重新初始化——可引用[本目录 demo](#6-可运行-demo) 的对照实验：结合 persisted、执行 ID 和初始化事件判断，不能只看请求数量。

## 9. 参考资料

- [web.dev：Back/forward cache](https://web.dev/articles/bfcache)
- [HTML Standard：the `pageshow` event](https://html.spec.whatwg.org/multipage/browsing-the-web.html#event-pageshow)
- [Chrome Developers：Back/forward cache](https://developer.chrome.com/docs/web-platform/bfcache)
