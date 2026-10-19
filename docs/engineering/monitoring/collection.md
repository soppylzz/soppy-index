# 异常采集：能收到哪些信号，哪些收不到

没有上报异常不等于没有故障。JS 抛错、资源加载失败、HTTP 500 和页面进程退出，需要不同的观测方式。

## JavaScript 和资源错误

全局 error 可观察未捕获同步异常；资源 error 通常不冒泡，可在捕获阶段按 target 区分 script、link、img 等失败。Promise 未处理拒绝使用 unhandledrejection，框架边界还能补充组件上下文。

Try/catch 只覆盖当前同步执行和被 await 的拒绝；未来 timer 的抛错不在之前的 try 中。框架错误边界的范围要按实现确认。跨源脚本详情也可能受限，需结合资源的 crossorigin 与服务端 CORS 配置。

同一失败可能先手工 capture，再到框架和全局，采集时要去重；全局兜底不能取代局部恢复。见 [Window error](https://developer.mozilla.org/en-US/docs/Web/API/Window/error_event)、[未处理拒绝](https://developer.mozilla.org/en-US/docs/Web/API/Window/unhandledrejection_event)。

错误事件尽量保留 Error 的 name、message、stack、cause 与组件上下文；拒绝原因也可能不是 Error，需要安全归一化。跨源脚本受限时可能只得到 `Script error.`，应确认 CORS 条件，而非假设监控平台能补回缺失堆栈。

## HTTP 与浏览器网络信号

Fetch 在 HTTP 错误状态仍可返回响应，要显式检查 status；XHR 区分 load、error、timeout 和 abort。主动取消通常不应统计为系统失败。

记录归一化 endpoint、方法、耗时、状态和 request ID，而非完整 body 和 header。Resource Timing 能提供加载阶段，跨源详细数据受 Timing-Allow-Origin 等规则限制；JS 通常不能获得浏览器网络面板里的全部底层原因。

资源 error 本身也不保证提供 HTTP 状态。诊断缺失 chunk 时应关联 URL、release、CDN 记录、网络上下文和 Service Worker 状态。见 [Resource Timing](https://developer.mozilla.org/en-US/docs/Web/API/PerformanceResourceTiming)。

## 白屏和崩溃不能只看 DOM 数量

白屏可定义为关键内容在合理期限内未出现，并结合业务就绪标记、关键节点和错误信号。骨架屏、空状态和登录页会让“body 有无节点”的判定失效。

主线程卡死可能导致检测代码自己也无法执行，进程被杀后更不一定来得及上报。下次启动标记和未正常结束会话只能提供疑似证据，不能直接等同于崩溃。

ChunkLoadError 可能由发布不一致、缓存旧入口或网络失败产生。自动刷新前检查未保存内容、限制次数，并提供手动恢复；无限刷新只会掩盖故障并丢失用户现场。
