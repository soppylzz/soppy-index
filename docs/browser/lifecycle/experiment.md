# 页面生命周期实验走查

本实验按独立主题路由观察页面事件，并用执行 ID 区分文档。页面日志和 Console 记录事件，终端显示 HTTP 请求；各页历史日志与草稿独立保存在 sessionStorage，读取旧日志不代表旧文档仍然存活。

## 运行

需要 Node >= 22.18。在仓库根目录执行：

```bash
pnpm install
pnpm --filter lifecycle-next-lab dev
```

打开 <http://127.0.0.1:5006/>，按 `Ctrl+C` 停止。独立构建与生产运行：

```bash
pnpm --filter lifecycle-next-lab build
pnpm --filter lifecycle-next-lab start
```

端口由 Next CLI 管理；需要覆盖时执行 `pnpm --filter lifecycle-next-lab exec next dev -H 127.0.0.1 -p 另一个端口`。使用稳定 origin，避免改变浏览器存储与页面身份的实验条件。

[Route Handler](./demo/lib/handler.ts) 为各模式返回独立 HTML，页面事件由原生脚本记录。这里刻意不使用 React hydration 和客户端路由，避免把框架挂载、卸载误认成 Document 生命周期。首次开发编译会增加加载耗时；比较事件时序时优先使用生产构建，并保持同一地址与实验参数。

## 生命周期路由

| 路由          | 主题             | 主要操作与证据                                               |
| ------------- | ---------------- | ------------------------------------------------------------ |
| `/`           | 实验目录         | 不安装实验计时器或自动上报                                   |
| `/loading`    | 加载与重建       | readyState、DOMContentLoaded、load、pageshow，刷新后 ID 改变 |
| `/visibility` | 前后台与主动暂停 | 草稿检查点、timer/rAF 与应用轮询                             |
| `/freeze`     | 冻结、恢复与丢弃 | Chromium 工具、freeze/resume、wasDiscarded                   |
| `/leave`      | 离开提醒         | 编辑后条件注册 beforeunload，确认后移除                      |
| `/report`     | 离页上报         | Beacon、keepalive、hidden 自动上报及服务端记录               |
| `/bfcache`    | 历史恢复         | 中转后后退，对比 persisted、ID 与内存计数                    |

`/between?from=/bfcache` 或 `/between?from=/leave` 提供安全的中转对照，未知 from 回到 BFCache 实验。`/api/state`、`/api/report`、`/api/reports` 保留原接口。

每个实验有独立的 sessionStorage 日志和草稿 key，页面日志最多 100 条；刷新可读取旧日志，但执行 ID 会区分新旧文档。计时器仅在 visibility/freeze/bfcache 页运行，应用轮询仅在 visibility/freeze 页运行，自动 Beacon 仅在 report 页启用。pagehide 清理计数器，pageshow 恢复，BFCache 命中与否仍由浏览器决定。

HTML 使用 `no-cache`，API 使用 `no-store`。服务器上报列表仅存进程内，最多 100 条，跨标签共享；停止服务不清理浏览器存储。新版本按主题使用独立 key，旧版合并实验的 `lifecycle-lab-journal` / `lifecycle-lab-draft` 不自动迁移或删除。

## 1. 初次加载与刷新

打开 `/loading`，清空日志后刷新，观察 `script start → readystatechange(interactive) → DOMContentLoaded → readystatechange(complete) → load → pageshow(persisted=false)`。这是本实验简单页面的预期序列；focus 等事件可能穿插，精确时间不固定。

刷新后 executionId 改变，内存计数重建；此页没有草稿、轮询或自动上报。其他主题的草稿可以从各自 sessionStorage 恢复；不要用“草稿还在”判断 BFCache。需要放慢网络对比 DOMContentLoaded 与 load 时，使用 [loading 实验](../loading/experiment.md)，此处不重复脚本解析实验。

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

## 7. 路由与观察隔离

首页只是目录。共享服务中的导航实验走查见 [History 与 Location](../navigation/experiment.md)。loading/history/navigation 不启动实验计数器或应用轮询；visibility/freeze 有 timer/rAF 与主动轮询；bfcache 只有 timer/rAF 对照；leave 只有草稿和条件提醒；report 只有上报操作。其他真实页面事件仍会记录，不能因控制台出现 visibilitychange 就说两个实验混在一起。

所有 HTML 路由支持 GET/HEAD，采用 no-cache；History fallback 仅允许两个已知子路径。`/history/view/missing`、未知脚本与未知 API 仍应为 404，POST 文档为 405。终端请求日志、浏览器事件和 UI 操作结果需要分别判读。

## 历史验证记录

以下记录来自迁移前的 node:http 版本，不作为当前 Next.js 或浏览器行为已复测的证据。当前协议检查见[本实验测试](./demo/__test__/routes.test.ts)。

以下保留 2026-10-08 路由拆分后的实测结果；本次文档整理未重新执行实验。环境为 macOS、Node v22.23.2、Chrome 153.0.8010.48（Asia/Shanghai）。Playwright 使用独立临时上下文验证按钮与路由；另启动原生 Headless Chrome，通过 CDP 验证真实可见性、受控冻结和 BFCache。临时脚本、输出及配置均位于仓库外 `/tmp/lifecycle-validation`，无新增项目依赖。

| 验证项 | 当次实际结果 |
| --- | --- |
| 路由分离 | 八条主题路由均加载，无未捕获脚本异常；草稿、提醒、上报控件只在相应页面出现 |
| 加载与提醒 | loading 有真实加载事件且不启动轮询；leave 仅勾选不注册，编辑后注册，确认后移除 |
| 真实前后台 | 原生 Chrome/CDP 切换目标后，visibility 页变 hidden、pollingTimer 为 null；恢复后重新可见 |
| 受控冻结 | 原生 CDP 的 frozen/active 命令后，日志确有 freeze/resume；只证明受控路径，未证明自然内存压力策略 |
| BFCache | 原生 Chrome 后退出现 pageshow.persisted=true，ID 相同，当前 ID 只出现一次 script start / DOMContentLoaded；Playwright 对照也命中 |
| 上报隔离 | visibility 页隐藏没有该执行 ID 的上报；report 页隐藏的 report ID/元数据出现在服务端；手动 Beacon 与 keepalive 也收到 |
| 普通返回 | 从 BFCache 中转页经普通链接返回产生新 ID，草稿仍可从该主题存储读取 |
| 服务边界 | 全部 HTML 入口和已知 fallback 的 GET/HEAD、MIME、no-cache、HEAD 空响应通过；未知路径/脚本/API 为 404，文档 POST 为 405 |
| 上报边界 | 非法 JSON 400、超过 8 KiB 为 413、合法记录 204；API JSON/no-store 通过 |
| CLI / 配置 | 旧版 PORT=0 的实际入口地址正确、端口冲突非零退出且无成功横幅；启动与含 Unicode 路径的请求日志均为英文 / ASCII |
| 静态检查 | 根 tsconfig、变更源码 ESLint、变更文件 Prettier、相对链接和锚点、JS/TS 代码块语法检查通过 |

Playwright 默认环境中标签切换仍返回 visible，且 CDP 冻结命令未得到相应事件，不能据命令成功判为验证通过。真实 hidden/freeze/resume 的结论来自另一套原生 Chrome/CDP 环境，已将两套结果分开。测试也遇到 BFCache 恢复不重新触发 load，因此后退验证按 URL、persisted 和执行 ID 等待，没有把“等不到新的 load”当作恢复失败。

上面的无事件短时观察仅描述本次样本；pushState 的事件规则同时依据标准，不从等待 150ms 推出普遍结论。Firefox/Safari、移动端、真实离开对话框展示、chrome://discards 自然丢弃、滚动恢复、系统杀进程与断网重试未验证，按对应路由手动复核。

另有拆分前同日合并页面的有效观察：BFCache 恢复日志出现 resume → pageshow(persisted=true)，恢复时页面仍为 hidden。这条历史记录说明 pageshow 不等于当前标签可见，不作为当前所有路由的重新实测；应用轮询仍应依据 visibilityState 决定是否启动。
