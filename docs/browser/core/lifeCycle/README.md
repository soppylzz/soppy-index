# 页面生命周期

[返回浏览器核心目录](../README.md) · [资源加载](../loading/README.md) · [BFCache](./bfcache.md)

本目录承接资源加载中的页面事件，重点讨论页面何时可见、何时暂停、离开后是否保留，以及如何保存和恢复应用状态。

- [生命周期笔记](./index.md)：加载状态、页面事件、后台运行、BFCache、冻结与丢弃、离页保存和上报。
- [BFCache 专题](./bfcache.md)：页面快照、恢复资格、诊断与 HTTP 缓存的区别。
- [实验走查](./demo.md)：操作步骤、判断依据、实际观测与复现边界。
- [实验服务](./index.ts)：零依赖 HTTP 服务，使用浏览器原生事件。

## 运行

需要 Node >= 22.18 和现代浏览器。在仓库根目录运行：

```bash
node docs/browser/core/lifeCycle/index.ts
```

打开 <http://localhost:5006/>。启动成功后，CLI 会输出入口、操作步骤、观察位置和运行条件；按 `Ctrl+C` 停止。端口冲突时可切换：

```bash
PORT=5007 node docs/browser/core/lifeCycle/index.ts
```

服务只监听本机 `127.0.0.1`，不要通过 `file://` 运行。草稿与历史日志存在当前标签的 `sessionStorage`，实验期间保持主机、端口和标签一致；`localhost` 与 `127.0.0.1` 属于不同源。上报只发往本地服务，不包含草稿正文。

## 实验入口

| 实验             | 操作                                                    | 观察                                                      |
| ---------------- | ------------------------------------------------------- | --------------------------------------------------------- |
| 加载与重建       | 首次打开、刷新                                          | readyState、DOMContentLoaded、load、pageshow、executionId |
| 可见性与工作暂停 | 输入草稿后切换标签再返回                                | visibilitychange、草稿检查点、应用轮询暂停与重启          |
| BFCache          | 从 `/` 到 `/between`，再通过历史记录后退                | pageshow.persisted、executionId、内存计数和草稿           |
| 离开提醒         | 勾选提醒、编辑、离开；取消离开后确认草稿                | beforeunload 仅在有待确认修改时注册                       |
| 小数据上报       | 发送 Beacon / keepalive，再查询接收记录                 | 浏览器入队或响应日志与 `/api/reports`                     |
| 冻结与丢弃       | Chromium 的 `chrome://discards`，按浏览器提供的操作测试 | freeze/resume、wasDiscarded 与新旧执行身份                |

HTML 响应使用 `Cache-Control: no-cache`；API 使用 `no-store`。HTTP 缓存与 BFCache 是不同机制，响应头不能保证后退命中 BFCache。接收记录仅保存在服务进程内，最多 100 条，停止服务后消失；页面日志最多 100 条。

本实验不模拟系统杀进程，不保证获得后台节流的固定频率，也不把浏览器扩展事件当作跨浏览器承诺。对照步骤与验证范围见 [demo.md](./demo.md)。
