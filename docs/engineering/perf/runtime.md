# 运行时性能：为什么点了按钮却迟迟没反应

订单数据下载完毕，不代表页面已经轻松。解析 JSON、更新状态、布局大量行和绘制图表都可能占据主线程。

## 先把交互延迟拆开

输入到达时可能正在执行旧任务，形成输入延迟；监听器和同步业务逻辑产生处理时间；后续布局与绘制形成呈现延迟。只压缩监听器内部代码，未必解决前后两段等待。

超过 50 毫秒的任务属于 Long Task，但低于这一阈值也可能错过帧预算。连续 Promise 微任务在切换任务前执行，并不真正让出主线程；任务拆批后要在批次之间安排浏览器可调度的让步。

`scheduler.yield()` 需考虑支持范围；rAF 适合帧前视觉更新，但大计算放入 rAF 仍会卡住这一帧。Idle callback 适合可推迟工作，不适合必须及时完成的操作。

## 把计算和 DOM 成本分别处理

Worker 适合搜索、解析与计算，不能直接操作 DOM。消息复制有成本，大 ArrayBuffer 可 transfer 所有权；应比较端到端耗时，而非只看 Worker 内计算时间。

写样式后读取布局可能迫使同步计算，循环交错读写会放大成本。可先批量读，再计算和批量写；是否触发布局仍取决于当时脏状态与读取属性。

Transform/opacity 动画可能走合成路径，但并不保证永远免绘制；额外图层也消耗内存。Will-change 应有明确使用期，contain/content-visibility 可以缩小工作范围，仍需检查尺寸、滚动与可访问性影响。底层见[渲染](../../browser/rendering/rendering.md)。

`contain-intrinsic-size` 可为跳过渲染的内容提供尺寸估计，降低恢复布局时滚动和位移变化；估计不准确仍可能跳动。Raf 并不保证固定 60 Hz，预算还取决于设备刷新率与同帧其他工作。

## 大列表限制挂载量

虚拟列表只挂载可视窗口与少量 overscan。固定行高可直接由索引求位置，动态行高要测量、缓存和修正滚动锚点。Overscan 太小容易露白，太大又增加渲染成本。

分页、无限滚动、虚拟化可组合，但要处理焦点、键盘、查找和读屏。大量图形可比较 DOM、SVG 与 Canvas；Canvas 减少元素数量，也要求自行处理命中测试和语义。DocumentFragment 不保证解决布局瓶颈，事件委托也不能代替完整生命周期清理。

## 泄漏看回收后的基线

正常内存常呈 GC 锯齿，峰值高不等于泄漏。固定操作反复进入退出后，回收基线持续上升，再用 Heap Snapshot 比较对象和 retaining path。

Detached DOM 可能仍被闭包、全局集合或监听器保留。退出时清理 timer、订阅、Observer、Worker 和 Object URL，缓存也需上限。WeakMap 只避免键被自身强持有，不能自动移除其他强引用或资源。

延伸：[Long Tasks API](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceLongTaskTiming)、[Chrome 内存排查](https://developer.chrome.com/docs/devtools/memory-problems)。
