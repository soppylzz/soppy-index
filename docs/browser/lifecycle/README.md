# 页面生命周期

本模块沿页面加载、可见性变化、离开、冻结与恢复解释生命周期；BFCache 用于理解原文档恢复与重新加载的区别。

- [页面生命周期](./page-lifecycle.md)：加载、可见性、冻结丢弃、离开提醒和上报，含核心代码。
- [BFCache](./bfcache.md)：原文档恢复、诊断和 HTTP 缓存的区别。
- [实验走查](./experiment.md)：分路由操作、预期、实际验证与限制。
- [实验服务](demo/lib/handler.ts)：Next.js Route Handler 服务。

## 面试常考点

重点区分 readyState 与可见性、pagehide 与终止、计划缓存与实际 BFCache 恢复，以及 Beacon 入队与服务端收到。离开提醒不能代替保存；恢复后应重新同步外部状态。

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

页面和接口由 [Next.js Route Handler](./demo/lib/handler.ts) 提供，浏览器机制由原生脚本执行。加载与生命周期页面使用独立 HTML 响应，避免 React hydration、客户端路由和热更新脚本改变被测时序。开发首次编译会影响耗时比较，时序实验优先使用构建后的生产模式。

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

实验的资源、HTTP 辅助函数与测试均在本 demo 内维护，不依赖仓库级公共 demo 模块。
