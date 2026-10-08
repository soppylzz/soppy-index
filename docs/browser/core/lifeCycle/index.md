# 页面生命周期实验走查

[运行方式](./README.md) · [知识笔记](./pageLifecycle.md) · [实现](./index.ts)

先在仓库根目录运行 `node docs/browser/core/lifeCycle/index.ts`，打开终端打印的实验页，默认 <http://localhost:5006/>。页面事件同步输出到 Console，终端只显示 HTTP 请求/响应。日志按发生顺序追加，最多保留 100 条，并用执行 ID 前缀区分文档。历史日志来自 sessionStorage，不代表旧文档仍然存活。

## 1. 初次加载与刷新

清空日志后刷新，观察 `script start → readystatechange(interactive) → DOMContentLoaded → readystatechange(complete) → load → pageshow(persisted=false)`。这是本实验简单页面的预期序列；focus 等事件可能穿插，精确时间不固定。

刷新后 executionId 改变，内存计数重建；之前输入的草稿可以从本标签 sessionStorage 恢复。不要用“草稿还在”判断 BFCache。需要放慢网络对比 DOMContentLoaded 与 load 时，使用 [loading 实验](../loading/index.md)，此处不重复脚本解析实验。

## 2. 切换标签与恢复可见

输入草稿，打开另一个标签并切换过去，等几秒再返回。查看 `visibilitychange(hidden)`、`checkpoint`、`应用轮询：暂停`，返回时查看 visible、轮询重启及获取服务端时间的日志。

“应用轮询”计数由代码主动暂停；timer 和 rAF 用于观察浏览器实际调度。前后台的计数速度可能不同，但不要求固定比例。用墙钟经过时间与计数对比，解释为什么定时器回调次数不能充当准确计时。

hidden 默认触发小型 Beacon；返回后点击“查询服务端接收记录”，用 report ID 关联客户端与服务端记录。切换只是一次可能的上报时机，不能表示用户永久离开。

## 3. BFCache 与新文档对照

先取消离开提醒，输入草稿，记下 executionId 和计数。点击“前往中转页”，再点击“通过历史记录后退”。

| 结果                                                   | 判断                                    |
| ------------------------------------------------------ | --------------------------------------- |
| pageshow.persisted=true，ID 相同，计数延续             | 实际从 BFCache 恢复；旧堆和监听继续使用 |
| pageshow.persisted=false，出现新 script start，ID 改变 | 新文档初始化，草稿可能依靠存储恢复      |
| 离开时 pagehide.persisted=true                         | 浏览器计划保留，不能保证后面一定恢复    |

从中转页点击普通链接返回作为对照，通常产生新文档。BFCache 恢复时不会重新发生本轮 DOMContentLoaded/load，页面仍会在 pageshow 刷新服务端状态。

如果未命中，查看 Chromium DevTools 的 Application → Back/forward cache 诊断，或新文档 `PerformanceNavigationTiming.notRestoredReasons`（需浏览器支持）。关闭 DevTools、扩展或额外监听后重试；浏览器可以基于自身策略拒绝缓存，不能仅凭请求数量下结论。

## 4. 条件注册 beforeunload

勾选提醒但不编辑，查看监听仍为 false。输入内容后变为 true，再点击中转链接。具备用户交互等条件时，浏览器可能显示自己的离开确认框；取消离开，点击“保存并确认本地草稿”，确认监听移除，再次离开。

草稿输入时已备份；dirty 表示当前文档尚未经过显式确认，不等于本地完全没有副本。自动检查点不清除 dirty。显式确认仅保存本地，不提交服务端业务。该标记刷新后重置，是这个小实验的简化条件。

不要为观测而注册 unload。beforeunload 是否提示、是否影响 BFCache 都不能用单个浏览器推成跨浏览器结论。

## 5. 入队与接收对照

分别点击发送 Beacon 和 keepalive fetch，再查询服务端记录。

- Beacon 日志中的 `accepted=true` 是客户端入队结果。
- keepalive 在当前页仍可执行时记录收到的 HTTP 204。
- `/api/reports` 列出服务进程实际接收的 report ID、接收时间与元数据；列表包括其他实验标签，最多 100 条。

切后台后返回再查询，能检查 hidden 上报是否到达本地服务。这只验证当前网络与进程正常时的实验路径，没有验证系统杀进程、断网重试或必达。页面故意不发送大包；请求过大和非法 JSON 是本地接口的错误路径，不是浏览器配额实验。

## 6. Chromium 的冻结与丢弃

保留实验标签，打开 `chrome://discards`，让实验页成为后台标签。按当前版本提供的 Freeze / Discard 操作测试；界面和可用操作由版本与策略决定。

冻结前后观察 freeze/resume、计数暂停、墙钟增长和恢复日志。丢弃后重新激活实验标签，观察新 executionId、重新加载、草稿恢复；支持时 `document.wasDiscarded=true`。discard 没有原页面内的“最后通知”。普通刷新不能证明丢弃恢复，手动派发同名事件也不能证明真实冻结。

自动化也可用 Chromium DevTools Protocol 的 `Page.setWebLifecycleState` 控制 frozen/active，验证受控冻结路径；它不证明浏览器在自然内存压力下会按同样时机冻结或丢弃。

## 验证记录

2026-10-08，Node v22.23.2、macOS、Headless Chrome 153.0.8010.48，独立临时浏览器配置，通过 DevTools Protocol 验证。测试脚本与配置留在仓库外。

| 验证项       | 实际结果                                                                            |
| ------------ | ----------------------------------------------------------------------------------- |
| 初次加载     | 观察到 loading → interactive → DOMContentLoaded → complete → load → pageshow(false) |
| 提醒监听     | 仅勾选不注册；编辑后注册；确认后移除                                                |
| 真实标签切换 | 观察到 hidden/visible 与应用轮询暂停/恢复                                           |
| 受控冻结     | Page.setWebLifecycleState 触发真实 freeze/resume；不代表自然内存压力策略            |
| 历史记录后退 | pageshow.persisted=true，executionId 与草稿保持；没有重新初始化文档                 |
| 刷新对照     | executionId 改变，草稿从 sessionStorage 恢复                                        |
| 上报         | Beacon 与 keepalive 的元数据均出现在服务端接收列表                                  |
| 服务边界     | GET/HEAD、404/405、非法 JSON 400、超过 8 KiB 的请求体 413、端口冲突提示均通过       |
| 浏览器异常   | 未捕获到 Runtime.exceptionThrown                                                    |

本次 BFCache 恢复日志中出现 resume → pageshow(persisted=true)，恢复时页面仍为 hidden，说明 pageshow 不等于“当前标签一定可见”。应用轮询仍应依据 visibilityState 决定是否启动。

事件的精确毫秒和跨任务源插入顺序不属于保证。未自动验证离开对话框的实际展示、chrome://discards 的丢弃恢复、移动端杀进程与跨浏览器策略，需按上述步骤在目标环境继续观察。
