# 页面生命周期与历史导航实验走查

[运行方式](./README.md) · [生命周期](./pageLifecycle.md) · [History](./history.md) · [BFCache](./bfcache.md) · [实现](./index.ts)

公共模块迁移后的知识 / demo 对应复核与实际运行记录见[集中验证](../../../demo/validation.md)；下方早期记录保留各自的环境与覆盖边界。

先在仓库根目录运行 `node docs/browser/core/lifeCycle/index.ts`，打开默认 <http://localhost:5006/> 实验目录，选择独立主题路由。页面事件同步输出到 Console，终端只显示 HTTP 请求/响应。日志按发生顺序追加，最多保留 100 条，并用执行 ID 前缀区分文档。每个实验的历史日志与草稿独立保存在 sessionStorage；读取旧日志不代表旧文档仍然存活。

## 1. 初次加载与刷新

打开 `/loading`，清空日志后刷新，观察 `script start → readystatechange(interactive) → DOMContentLoaded → readystatechange(complete) → load → pageshow(persisted=false)`。这是本实验简单页面的预期序列；focus 等事件可能穿插，精确时间不固定。

刷新后 executionId 改变，内存计数重建；此页没有草稿、轮询或自动上报。其他主题的草稿可以从各自 sessionStorage 恢复；不要用“草稿还在”判断 BFCache。需要放慢网络对比 DOMContentLoaded 与 load 时，使用 [loading 实验](../loading/index.md)，此处不重复脚本解析实验。

## 2. 切换标签与恢复可见

打开 `/visibility`，输入草稿，打开另一个标签并切换过去，等几秒再返回。查看 `visibilitychange(hidden)`、`checkpoint`、`应用轮询：暂停`，返回时查看 visible、轮询重启及获取服务端时间的日志。

“应用轮询”计数由代码主动暂停；timer 和 rAF 用于观察浏览器实际调度。前后台的计数速度可能不同，但不要求固定比例。用墙钟经过时间与计数对比，解释为什么定时器回调次数不能充当准确计时。

此页不自动发 Beacon，上报移到 `/report`，避免把可见性实验的请求与上报实验混在一起。切换标签不表示用户永久离开。

## 3. BFCache 与新文档对照

打开 `/bfcache`，输入草稿，记下 executionId 和计数。此页没有离开提醒或自动上报，减少实验变量。点击“前往中转页”，再点击“通过历史记录后退”。

| 结果                                                   | 判断                                    |
| ------------------------------------------------------ | --------------------------------------- |
| pageshow.persisted=true，ID 相同，计数延续             | 实际从 BFCache 恢复；旧堆和监听继续使用 |
| pageshow.persisted=false，出现新 script start，ID 改变 | 新文档初始化，草稿可能依靠存储恢复      |
| 离开时 pagehide.persisted=true                         | 浏览器计划保留，不能保证后面一定恢复    |

从中转页点击普通链接返回作为对照，通常产生新文档。BFCache 恢复时不会重新发生本轮 DOMContentLoaded/load，页面仍会在 pageshow 刷新服务端状态。

如果未命中，查看 Chromium DevTools 的 Application → Back/forward cache 诊断，或新文档 `PerformanceNavigationTiming.notRestoredReasons`（需浏览器支持）。关闭 DevTools、扩展或额外监听后重试；浏览器可以基于自身策略拒绝缓存，不能仅凭请求数量下结论。

## 4. 条件注册 beforeunload

打开 `/leave`，勾选提醒但不编辑，查看监听仍为 false。输入内容后变为 true，再点击中转链接。具备用户交互等条件时，浏览器可能显示自己的离开确认框；取消离开，点击“保存并确认本地草稿”，确认监听移除，再次离开。

草稿输入时已备份；dirty 表示当前文档尚未经过显式确认，不等于本地完全没有副本。自动检查点不清除 dirty。显式确认仅保存本地，不提交服务端业务。该标记刷新后重置，是这个小实验的简化条件。

不要为观测而注册 unload。beforeunload 是否提示、是否影响 BFCache 都不能用单个浏览器推成跨浏览器结论。

## 5. 入队与接收对照

打开 `/report`，分别点击发送 Beacon 和 keepalive fetch，再查询服务端记录。此页是唯一默认启用 hidden 自动 Beacon 的路由。

- Beacon 日志中的 `accepted=true` 是客户端入队结果。
- keepalive 在当前页仍可执行时记录收到的 HTTP 204。
- `/api/reports` 列出服务进程实际接收的 report ID、接收时间与元数据；列表包括其他实验标签，最多 100 条。

切后台后返回再查询，能检查 hidden 上报是否到达本地服务。这只验证当前网络与进程正常时的实验路径，没有验证系统杀进程、断网重试或必达。页面故意不发送大包；请求过大和非法 JSON 是本地接口的错误路径，不是浏览器配额实验。

## 6. Chromium 的冻结与丢弃

打开 `/freeze` 并保留实验标签，打开 `chrome://discards`，让实验页成为后台标签。按当前版本提供的 Freeze / Discard 操作测试；界面和可用操作由版本与策略决定。

冻结前后观察 freeze/resume、计数暂停、墙钟增长和恢复日志。丢弃后重新激活实验标签，观察新 executionId、重新加载、草稿恢复；支持时 `document.wasDiscarded=true`。discard 没有原页面内的“最后通知”。普通刷新不能证明丢弃恢复，手动派发同名事件也不能证明真实冻结。

自动化也可用 Chromium DevTools Protocol 的 `Page.setWebLifecycleState` 控制 frozen/active，验证受控冻结路径；它不证明浏览器在自然内存压力下会按同样时机冻结或丢弃。

## 7. History 与同文档路由

打开 `/history`，先与页面交互，记下 executionId、length 和事件计数。

1. 点击 pushState：URL 变为 `/history/view/a`，UI 更新，length 相对增加；执行 ID 不变，没有新文档 GET，也没有由调用直接触发的 popstate/hashchange。
2. 点击 replaceState：URL 变为 `/history/view/b`，length 不再增加。后退回 `/history`，前进到 B；A 已被 B 替换。
3. 点击 pushState 修改 hash：URL 有新 fragment，调用本身不触发 hashchange。
4. 点击 location.hash 新值：看真实 hashchange；再重复当前 hash，观察没有额外变化事件。popstate 是否出现还要检查实际 state 激活，不从按钮名字推断。
5. 点击两个拒绝按钮，观察真实 catch 中的 SecurityError 与 DataCloneError；URL 不因失败调用跳转。
6. 刷新 `/history/view/a` 或把地址粘贴到新标签：服务端返回同一 History 入口，视图从 pathname 恢复；刷新创建新 executionId。

页面初始化仅在 history.state 为 null 时使用 replaceState 填充 initial 状态，不计入按钮的 replace 计数。length 包含进入实验前的记录，不能用绝对值推断游标。push 后再创建新条目可能使原来的前进分支不可达，请按顺序分别测试。

## 8. Location 文档导航

每组先从 `/loading` 通过页面导航栏进入 `/navigation`。

| 操作             | 再在目标页点击 back 的预期              |
| ---------------- | --------------------------------------- |
| location.assign  | 回到 `/navigation` 操作页               |
| location.replace | 跳过被替换的操作页，回到此前 `/loading` |

目标路径为 `/navigation/target?via=assign` 或 `?via=replace`，用 URL 与新 executionId 核对。回操作页可能恢复 BFCache，所以“回到同一个 ID”不表示 assign 没有产生文档导航。

分别点击 reload 与 history.go(0)，比较加载流程和新 ID。这里的目标为不同路径，没有用 fragment-only 导航代替文档重建。边界见 [History 笔记](./history.md)。

## 9. 路由与观察隔离

首页只是目录。loading/history/navigation 不启动实验计数器或应用轮询；visibility/freeze 有 timer/rAF 与主动轮询；bfcache 只有 timer/rAF 对照；leave 只有草稿和条件提醒；report 只有上报操作。其他真实页面事件仍会记录，不能因控制台出现 visibilitychange 就说两个实验混在一起。

所有 HTML 路由支持 GET/HEAD，采用 no-cache；History fallback 仅允许两个已知子路径。`/history/view/missing`、未知脚本与未知 API 仍应为 404，POST 文档为 405。终端请求日志、浏览器事件和 UI 操作结果需要分别判读。

## 实际验证记录

以下保留 2026-10-08 路由拆分后的实测结果；本次文档整理未重新执行实验。环境为 macOS、Node v22.23.2、Chrome 153.0.8010.48（Asia/Shanghai）。Playwright 使用独立临时上下文验证按钮与路由；另启动原生 Headless Chrome，通过 CDP 验证真实可见性、受控冻结和 BFCache。临时脚本、输出及配置均位于仓库外 `/tmp/lifecycle-validation`，无新增项目依赖。

| 验证项         | 当次实际结果                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| 路由分离       | 八条主题路由均加载，无未捕获脚本异常；草稿、提醒、上报控件只在相应页面出现                                                       |
| push / replace | URL 与 UI 同步改变，executionId 不变；当次 length 从 11 到 12，replace 后仍为 12，按钮操作没有文档请求                           |
| History 遍历   | 后退回 `/history`、前进到 B，真实 popstate 更新计数，ID 保持                                                                     |
| hash 对照      | pushState 改 hash 不增加 hashchange；location.hash 新值产生真实事件；重复当前值后 150ms 内事件计数不变                           |
| 拒绝路径       | 实际捕获跨源 URL 的 SecurityError、函数 state 的 DataCloneError                                                                  |
| 子路径刷新     | 直接打开 `/history/view/a` 恢复 A 视图；刷新后新 executionId                                                                     |
| Location       | assign 目标页后退到 `/navigation`；replace 目标页后退跳过操作页到 `/loading`；reload 与 go(0) 均生成新 ID                        |
| 加载与提醒     | loading 有真实加载事件且不启动轮询；leave 仅勾选不注册，编辑后注册，确认后移除                                                   |
| 真实前后台     | 原生 Chrome/CDP 切换目标后，visibility 页变 hidden、pollingTimer 为 null；恢复后重新可见                                         |
| 受控冻结       | 原生 CDP 的 frozen/active 命令后，日志确有 freeze/resume；只证明受控路径，未证明自然内存压力策略                                 |
| BFCache        | 原生 Chrome 后退出现 pageshow.persisted=true，ID 相同，当前 ID 只出现一次 script start / DOMContentLoaded；Playwright 对照也命中 |
| 上报隔离       | visibility 页隐藏没有该执行 ID 的上报；report 页隐藏的 report ID/元数据出现在服务端；手动 Beacon 与 keepalive 也收到             |
| 普通返回       | 从 BFCache 中转页经普通链接返回产生新 ID，草稿仍可从该主题存储读取                                                               |
| 服务边界       | 全部 HTML 入口和已知 fallback 的 GET/HEAD、MIME、no-cache、HEAD 空响应通过；未知路径/脚本/API 为 404，文档 POST 为 405           |
| 上报边界       | 非法 JSON 400、超过 8 KiB 为 413、合法记录 204；API JSON/no-store 通过                                                           |
| CLI / 配置     | PORT=0 的实际入口地址正确、端口冲突非零退出且无成功横幅；启动与含 Unicode 路径的请求日志均为英文 / ASCII                         |
| 静态检查       | 根 tsconfig、变更源码 ESLint、变更文件 Prettier、相对链接和锚点、JS/TS 代码块语法检查通过                                        |

Playwright 默认环境中标签切换仍返回 visible，且 CDP 冻结命令未得到相应事件，不能据命令成功判为验证通过。真实 hidden/freeze/resume 的结论来自另一套原生 Chrome/CDP 环境，已将两套结果分开。测试也遇到 BFCache 恢复不重新触发 load，因此后退验证按 URL、persisted 和执行 ID 等待，没有把“等不到新的 load”当作恢复失败。

上面的无事件短时观察仅描述本次样本；pushState 的事件规则同时依据标准，不从等待 150ms 推出普遍结论。Firefox/Safari、移动端、真实离开对话框展示、chrome://discards 自然丢弃、滚动恢复、系统杀进程与断网重试未验证，按对应路由手动复核。

另有拆分前同日合并页面的有效观察：BFCache 恢复日志出现 resume → pageshow(persisted=true)，恢复时页面仍为 hidden。这条历史记录说明 pageshow 不等于当前标签可见，不作为当前所有路由的重新实测；应用轮询仍应依据 visibilityState 决定是否启动。
