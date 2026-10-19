# 性能测量：先说清谁在什么地方慢

订单首屏空白很久、点击筛选无响应、翻页后滚动抖动，需要不同的证据。不要用一次跑分给所有体验下结论。

## 指标描述不同阶段

| 指标 | 回答的问题               | 常见误解           |
| ---- | ------------------------ | ------------------ |
| TTFB | 导航到首字节用了多久     | 只包含后端执行时间 |
| FCP  | 何时首次绘制内容         | 业务已经可用       |
| LCP  | 大块主要内容何时呈现     | 永远就是首张图片   |
| INP  | 交互到下一次绘制响应如何 | 只测 handler 执行  |
| CLS  | 页面是否发生非预期位移   | 所有位移简单相加   |

Core Web Vitals 当前采用 LCP、INP、CLS，良好阈值分别为不超过 2.5 秒、200 毫秒、0.1，按真实访问第 75 百分位，并分别看移动和桌面。阈值与生命周期以 [Web Vitals 官方说明](https://web.dev/articles/vitals)为准。

INP 涵盖输入等待、事件处理与呈现延迟，并非所有事件耗时的平均值。CLS 按会话窗口聚合位移分数，符合条件的近期输入位移会被排除。DOMContentLoaded、load 不能代替业务可用或交互指标。

## 实验室与 RUM 互补

实验室适合固定设备、网络、数据并比较改动；RUM 是真实用户监控，适合判断线上覆盖和长尾。P50 看典型体验，P75 看大部分用户，P95 暴露长尾；同一分位数还要按页面、设备、网络与版本切分。

平均值改善可能只是流量转向快设备，不能直接归因给优化。比较时保留样本量、缓存条件和时间范围，不把不同页面混成一个数。

## 指标怎样从浏览器进入监控

PerformanceObserver 按浏览器支持订阅 entry。Navigation Timing 对应文档导航，Resource Timing 对应资源，paint 对应绘制，Event Timing 和 Long Tasks 帮助分析交互与阻塞；LCP、CLS 还各有对应 entry 类型。

可用 `supportedEntryTypes` 检测支持范围；对支持回溯的类型，`observe({ type, buffered: true })` 可获取缓冲中的已有记录，但不代表能补齐页面过去的所有事件。见 [PerformanceObserver.observe](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceObserver/observe)。

原始 entry 不是最终指标：LCP 有候选更新与结束时机，CLS 要合并窗口，INP 要处理交互与页面生命周期。web-vitals 封装了指标算法和部分生命周期细节，自行实现应处理隐藏、BFCache 恢复和不支持情形。见 [web-vitals](https://github.com/GoogleChrome/web-vitals)。

上报关联 metric ID、名称、值、视图、版本与必要环境，服务端按协议合并同一指标的更新，过滤重复、机器人和无效样本。不支持不能填 0，否则会让分位数虚假改善；传输与生命周期限制见[监控 SDK](../monitoring/sdk.md)。

## 从瀑布图走到调用栈

先看 Network：TTFB、发现时间、串行链、优先级、缓存和传输体积。资源很晚才开始请求，先找是谁阻止它被发现；下载结束仍不显示，再对齐主线程 trace。

Performance 中区分等待、JS、样式、布局、绘制和呈现。Self time 是函数自身，total time 包含子调用，最宽调用栈是线索但仍要找具体成本。Coverage 只表示本次路径未使用，不能直接把那些代码删除。

Lighthouse 提供常见问题线索，TBT 描述加载窗口的主线程阻塞，可辅助诊断但不能替代真实 INP。BFCache 恢复与 SPA 软导航也有不同测量口径，不应把一次硬导航指标复用于每个路由。

Frames/Interactions 帮助对齐掉帧与输入，Paint flashing 与图层信息帮助判断重绘范围。内存排查可用快照 Comparison 对比存活对象，Allocation 工具追踪分配位置；操作前后应回到相同页面状态。

录制时固定数据、扩展与 CPU/网络条件，并保留未限速对照；限速不等于真实低端设备。优化优先级再结合受影响用户、预期收益、风险和维护成本，避免只优化最容易跑分的页面。

一次只改变主要因素，在一致条件下重复测量，再用线上分布确认收益。DevTools 操作细节见 [Performance 文档](https://developer.chrome.com/docs/devtools/performance)。
