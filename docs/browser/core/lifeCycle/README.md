# 页面生命周期与历史导航

[返回浏览器核心目录](../README.md) · [资源加载](../loading/README.md) · [跨上下文通信](../../communication/README.md) · [公共样式与工具](../../../demo/README.md)

本目录把文档加载、后台活动、历史记录和页面恢复放在一起理解，每个实验使用独立路由。

- [页面生命周期](./pageLifecycle.md)：加载、可见性、冻结丢弃、离开提醒和上报，含核心代码。
- [History 与导航](./history.md)：Location、pushState/replaceState、popstate/hashchange、同文档路由和 fallback。
- [BFCache](./bfcache.md)：原文档恢复、诊断和 HTTP 缓存的区别。
- [实验走查](./index.md)：分路由操作、预期、实际验证与限制。
- [实验服务](./index.ts)：Node 原生 HTTP 服务，无新增依赖或构建步骤。

## 运行

需要 Node >= 22.18 和现代浏览器，在仓库根目录执行：

```bash
node docs/browser/core/lifeCycle/index.ts
```

打开 <http://localhost:5006/> 目录页，选择一个主题。成功监听后 CLI 列出全部入口、步骤和观察位置；按 `Ctrl+C` 停止。端口占用时：

```bash
PORT=5007 node docs/browser/core/lifeCycle/index.ts
```

仅监听本机 `127.0.0.1`；不要通过 file:// 打开。保持相同 host、端口和标签，localhost 与 127.0.0.1 不同源。PORT 可为 0，由系统分配空闲端口，以 CLI 实际地址为准。

## 独立路由

| 路由          | 主题             | 主要操作与证据                                               |
| ------------- | ---------------- | ------------------------------------------------------------ |
| `/`           | 实验目录         | 不安装实验计时器或自动上报                                   |
| `/loading`    | 加载与重建       | readyState、DOMContentLoaded、load、pageshow，刷新后 ID 改变 |
| `/visibility` | 前后台与主动暂停 | 草稿检查点、timer/rAF 与应用轮询                             |
| `/freeze`     | 冻结、恢复与丢弃 | Chromium 工具、freeze/resume、wasDiscarded                   |
| `/leave`      | 离开提醒         | 编辑后条件注册 beforeunload，确认后移除                      |
| `/report`     | 离页上报         | Beacon、keepalive、hidden 自动上报及服务端记录               |
| `/bfcache`    | 历史恢复         | 中转后后退，对比 persisted、ID 与内存计数                    |
| `/history`    | 同文档历史       | push/replace、hash、前进后退、真实事件与拒绝路径             |
| `/navigation` | 文档导航         | assign/replace、reload/go(0) 与实际后退目标                  |

`/history/view/a`、`/history/view/b` 是明确的 History fallback；`/navigation/target` 是导航目标；`/between?from=/bfcache` 或 `/between?from=/leave` 提供安全的中转对照，未知 from 回到 BFCache 实验。`/api/state`、`/api/report`、`/api/reports` 保留原接口。

每个实验有独立的 sessionStorage 日志和草稿 key，页面日志最多 100 条；刷新可读取旧日志，但执行 ID 会区分新旧文档。计时器仅在 visibility/freeze/bfcache 页运行，应用轮询仅在 visibility/freeze 页运行，自动 Beacon 仅在 report 页启用。pagehide 清理计数器，pageshow 恢复，BFCache 命中与否仍由浏览器决定。

HTML 使用 `no-cache`，API 使用 `no-store`。服务器上报列表仅存进程内，最多 100 条，跨标签共享；停止服务不清理浏览器存储。新版本按主题使用独立 key，旧版合并实验的 `lifecycle-lab-journal` / `lifecycle-lab-draft` 不自动迁移或删除。
