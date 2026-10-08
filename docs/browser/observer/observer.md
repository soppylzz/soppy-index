# Observer：从变化信号到异步通知

[模块导航](./README.md) · [实验走查](./index.md) · [浏览器脚本](./assets/lab.js)

Observer 的价值是让浏览器收集符合条件的变化，再通知应用，减少应用自行轮询。回调仍在页面主线程执行，昂贵回调仍会阻塞；使用 Observer 不自动保证更快。注册、变化发生、通知交付、业务处理是不同阶段。

## 1. 根据观察对象选择 API

| API                  | 信号与目标                        | 不直接回答的问题                   | 常见用途                    |
| -------------------- | --------------------------------- | ---------------------------------- | --------------------------- |
| MutationObserver     | Node 的子节点、属性、文本数据变化 | CSS 布局尺寸是否改变               | 第三方 DOM 接入、编辑器同步 |
| IntersectionObserver | Element 与 root 的几何交叉状态    | 是否被遮挡、用户是否真正看过       | 懒加载、列表哨兵、曝光候选  |
| ResizeObserver       | Element 的指定布局盒尺寸          | 位置变化、CSS transform 的视觉放大 | 容器适配、图表重绘          |

MutationObserver 在微任务机制中交付记录；IntersectionObserver 在渲染更新中采样，再通过任务通知；ResizeObserver 在渲染更新的布局相关步骤交付。它们不是三个可以互换的“异步队列”，不要给 Promise、rAF 与所有 observer 编造一条通用固定顺序。基础调度见 [事件循环](../core/eventLoop/eventLoop.md)，布局与绘制见 [渲染流程](../core/rendering.md)。[DOM 标准](https://dom.spec.whatwg.org/#mutation-observers)、[Intersection Observer 处理模型](https://www.w3.org/TR/intersection-observer/#processing-model)、[Resize Observer 处理模型](https://drafts.csswg.org/resize-observer/#algorithms)分别规定其机制；后两者是仍在演进的规范草案。

本模块只研究这三类观察器。PerformanceObserver 观察性能条目，ReportingObserver 观察报告，不能因为名称相似就共用这里的时序结论。

## 2. MutationObserver：记录变化，而非订阅最终快照

`observe(target, options)` 至少启用 `childList`、`attributes`、`characterData` 之一。`subtree` 扩展到后代；`attributeFilter` 限定属性名称；`attributeOldValue`、`characterDataOldValue` 请求旧值。属性旧值或过滤器会在未明确设置时隐含开启 attributes，文本旧值类似；显式关闭对应种类却请求旧值等矛盾配置会抛 TypeError。[observe 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/observe)

以下是 `/mutation` 的核心逻辑；`target` 指向实验目标树，`mutationRecords` 负责记录真实 MutationRecord，省略按钮绑定、身份日志、重连保护与清理。完整代码见 [lab.js](./assets/lab.js)。

```js
const observer = new MutationObserver((records) => {
  mutationRecords(records, "回调 MutationObserver")
})
observer.observe(target, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ["data-count"],
  attributeOldValue: true,
  characterData: true,
  characterDataOldValue: true,
})

target.dataset.count = "1"
target.querySelector("#text").firstChild.data = "文本 1"
const child = document.createElement("span")
child.textContent = "新节点"
target.append(child)
```

这三次同步修改先完成，回调才有机会运行；同一批可能包含多条 record。不要把回调次数等同于修改次数，也不要认为批量通知会把所有变更合并成一个最终值。`record.type` 区分三种变化，`addedNodes` / `removedNodes` 是节点列表，`oldValue` 只在相应选项开启时提供。record 不携带通用 newValue；回调中读取 target 属性得到的是那一刻的当前状态，并非每条 record 的历史新值。

`textNode.data = ...` 改变字符数据；给元素设置 `textContent` 通常替换其子节点，观察到的类型可能是 childList。若要观察布局盒尺寸是否变化，应使用 ResizeObserver；它也不能替代对位置或交叉状态的判断。[MutationObserver 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)

### 读取队列与断开

`takeRecords()` 同步返回并清空尚未交付的记录，不执行回调。若本任务中只产生这些记录，稍后的通知就没有这些记录可交付。`disconnect()` 停止全部目标观察并丢弃待交付记录；业务需要处理尾部记录时先读取，再断开。[takeRecords 说明](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/takeRecords)、[disconnect 说明](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver/disconnect)

```js
const pending = observer.takeRecords()
mutationRecords(pending, "同步 takeRecords（非回调）")
observer.disconnect()
```

实验将“同步读取”和“立即断开丢弃”分成两个按钮，便于对照。日志区在观察树之外，避免记录日志触发自身。回调内再次修改观察树可能继续排队，甚至让微任务不断产生；优先缩小范围、过滤属性、比较新旧状态并让写入幂等。不要把临时 disconnect 当作无损暂停，断开期间不会补录变化。移除子树在移除记录交付前仍可能产生被观察到的子树变更，这也不是无限期跟踪脱离文档的节点。

## 3. IntersectionObserver：交叉不等于曝光

配置在构造时指定，同一 observer 可观察多个共享配置的目标。`root: null` 使用隐式视口；本实验明确指定同文档滚动容器，目标位于其后代中。`rootMargin` 调整根交叉矩形，正值适合提前加载，负值缩小范围；它不会改变页面实际可见区域，也不会取消中间祖先的裁剪。`threshold` 是目标面积交叉比例的阈值，不是 root 被占用的比例。[API 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)

以下摘自 `/intersection` 的双观察器配置；省略记录函数、特性检查、生命周期与重连代码：

```js
for (const margin of [0, 80]) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        log(
          `margin=${margin} intersecting=${entry.isIntersecting} ratio=${entry.intersectionRatio}`
        )
      }
    },
    {
      root: document.querySelector("#root"),
      rootMargin: `${margin}px`,
      threshold: [0, 0.5, 1],
    }
  )
  observer.observe(target)
}
```

注册后会异步交付初始状态，包括完全不交叉的目标。后续采样的阈值区间或 isIntersecting 改变才需要排队；不会为每一像素滚动通知。快速滚过多个阈值也不保证逐一报告中间比例。边缘刚好接触时，isIntersecting 可为 true 而 ratio 为 0；零面积目标还有专门的比例规则，因此不要无条件将二者互相替代。`entry.time` 是采样时间，属于文档性能时间轴，不是 UTC，也不一定等于回调执行时间。[规范的交叉更新算法](https://www.w3.org/TR/intersection-observer/#update-intersection-observations-algo)

本实验的普通 observer 没有启用 trackVisibility。覆盖红层后，目标几何仍可交叉；后台页面的交叉也不等于用户在看。实际曝光业务应组合 [页面可见性](../core/lifeCycle/pageLifecycle.md)、比例、持续时间和业务去重，并注明产品定义。trackVisibility、delay、scrollMargin 等扩展需单独检查支持，本实验不将它们当作通用前提。

`unobserve(target)` 移除单个目标，`disconnect()` 移除全部目标；`takeRecords()` 只读取已排队 entry，不能强制立即重新计算几何。disconnect 不等价于显式清空所有已排队 entry；本实验在重连时使用新实例并校验代次，忽略旧实例可能到来的交付。

## 4. ResizeObserver：观察哪个盒，就按哪个盒判断变化

| 观察 box                 | 尺寸含义                         | 用途                           |
| ------------------------ | -------------------------------- | ------------------------------ |
| content-box（默认）      | 内容盒，CSS 像素                 | 内容区域自适应                 |
| border-box               | 包含 padding 与 border，CSS 像素 | 外框占用尺寸                   |
| device-pixel-content-box | 内容盒，设备像素整数             | 高分辨率 canvas 等；需检测支持 |

entry 可以同时包含多个盒的尺寸，但“为什么触发通知”由 observe 的 box 决定。`contentBoxSize`、`borderBoxSize` 的 inlineSize / blockSize 是逻辑轴；横向书写时通常对应宽 / 高。数组结构不能随意简化成适用于所有分片布局的单一宽度；本实验只取普通、不分片目标的 `[0]`。`contentRect` 是内容盒的传统物理宽高字段。[ResizeObserverEntry 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry)

以下对应 `/resize` 的双盒对照，省略特性检查、反馈和清理：

```js
for (const box of ["content-box", "border-box"]) {
  const observer = new ResizeObserver((entries) => {
    for (const entry of entries) {
      log(
        `box=${box} content=${entry.contentBoxSize[0].inlineSize} border=${entry.borderBoxSize[0].inlineSize}`
      )
    }
  })
  observer.observe(target, { box })
}
```

实验使用 content-box 的 CSS sizing，内容宽固定，增加 padding 只改变 border box；切换内容宽则两者都会变化。CSS transform 改变视觉几何，不触发布局盒 resize 通知。通知并不限于 window.resize：父容器、字体和内容变化都可能间接改变目标尺寸。普通具有非零尺寸的可见目标在开始观察后会收到初始尺寸；不能将此概括成所有 display / 零尺寸情况下必有一次初始回调。[Resize Observer 规范](https://drafts.csswg.org/resize-observer/)

### 反馈与 resize loop

回调中改变被观察目标尺寸，会进入布局反馈。浏览器通过深度相关处理限制同一轮通知；仍有未交付变化时报告 `ResizeObserver loop completed with undelivered notifications.`，部分变化延至后续渲染机会。这不是自动修复业务无限增长。[ResizeObserver 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver)

实验只允许三次写入。直接写和下一帧写分别操作，真正的错误事件由 window error 监听记录，不手动派发：

```js
let writes = 0
let frame = 0
const observer = new ResizeObserver(() => {
  if (writes >= 3) return
  frame = requestAnimationFrame(() => {
    writes++
    target.style.width = `${240 + writes * 20}px`
  })
})
observer.observe(target)
```

这是演示核心而非通用防循环工具：完整实验还有代次校验、帧取消和 disconnect。rAF 只是推迟写入；真正停止依赖 `writes >= 3`。生产逻辑应采用幂等写入、预期尺寸比较、收敛约束，必要时观察容器、修改内部内容以避免自反馈。ResizeObserver 没有 takeRecords 方法；不要套用 MutationObserver 的队列排空模式。

## 5. 生命周期、能力与结论边界

完整脚本在 pagehide 断开 observer、取消 rAF 和观察期监听；pageshow.persisted 按此前状态恢复。手动断开后恢复仍保持断开。页面关闭后不再依赖该文档继续处理通知，也不要把自动垃圾回收当作组件卸载时的清理方案。相关保证与浏览器 BFCache 策略见 [生命周期笔记](../core/lifeCycle/pageLifecycle.md)和 [BFCache](../core/lifeCycle/bfcache.md)。

[lab.js](./assets/lab.js) 的 `stop()` 与 `connect()` 分别管理资源和本次连接的身份：

| 源码步骤                                | 作用                                                 |
| --------------------------------------- | ---------------------------------------------------- |
| stop 先递增 generation                  | 使旧连接捕获的 token 失效                            |
| disconnect、abort、cancelAnimationFrame | 分别停止观察、移除观察期事件监听、取消已登记的反馈帧 |
| connect 捕获当前 generation 为 token    | 为本次注册建立身份，而不是只看一个 connected 布尔值  |
| 回调与反馈写入检查 active()             | 只有 connected 且 token === generation 才继续处理    |

例如连接 A 断开后建立 B，connected 又变成 true；如果只检查布尔值，就无法识别旧 A 的任务。源码闭包里的 token 仍属于 A，因此代次检查能将它拒绝。下面摘出这一控制关系，省略 observer 注册与其他清理：

```js
// In stop().
generation++
// In connect(), after stopping the previous connection.
const token = generation
const active = () => connected && token === generation
```

资源清理用于停止后续工作，代次校验用于过滤旧连接的工作，二者职责不同。它不表示所有 observer 在 disconnect 后都必然继续回调：MutationObserver 会丢弃待交付记录，IntersectionObserver 的队列语义不同，ResizeObserver 也没有 takeRecords；应分别按前文处理。ResizeObserver 的反馈帧在写入前再次检查 active，避免只在排帧时检查、执行时却已重连。

能力检测用 `"ResizeObserver" in window` 等判断；构造、observe 仍捕获异常。尺寸字段不存在时页面标注“不可用”，不伪造设备像素数据。无原生 API 时可以针对业务选择降级；scroll / resize 监听不能完全替代这三种信号。

标准规定观察条件和交付模型；浏览器决定具体渲染机会、后台调度和扩展支持；本地实验验证的是指定环境中的结果。没有回调的短时观察只能作为对照记录，不能单独证明永久不会通知。实际验证与未覆盖环境见 [走查实测](./index.md)。
