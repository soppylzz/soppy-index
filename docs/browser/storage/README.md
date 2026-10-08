# 客户端存储实验

[返回仓库首页](../../../README.md) · [渲染与加载](../core/README.md) · [缓存实验](../cache/README.md) · [跨上下文通信](../communication/README.md)

每个主题包含中文笔记与自包含、零依赖的 `node:http` 实验服务。使用 Node >= 22.18，在仓库根目录执行命令，再用真实浏览器打开对应地址；按 `Ctrl+C` 停止服务。

## 主题与运行

| 主题                                      | 命令                                                   | 地址                                               | 观察重点                                               |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------ |
| [Cookie](./cookie/README.md)              | `node docs/browser/storage/cookie/index.ts`            | <http://localhost:3000> 与 <http://127.0.0.1:3001> | Cookie 携带、HttpOnly 和 SameSite 的对照               |
| [Web Storage](./webStorage/README.md)     | `node docs/browser/storage/webStorage/index.ts`        | <http://localhost:4000>                            | localStorage/sessionStorage、双标签隔离与 storage 事件 |
| [IndexedDB](./indexedDB/README.md)        | `node docs/browser/storage/indexedDB/index.ts`         | <http://localhost:5002>                            | 事务、索引、structured clone 与 schema 升级            |
| [存储管理](./storageManagement/README.md) | `node docs/browser/storage/storageManagement/index.ts` | <http://localhost:5001>                            | estimate、persist、OPFS 与配额失败处理                 |

启动成功后 CLI 会给出当前 URL、步骤及观察位置，监听失败时只报告错误。Cookie 使用 `BANK_PORT` / `EVIL_PORT`，其他实验使用 `PORT` 切换端口，详见各主题说明。

## 实验条件

Cookie 实验必须保持表中的两个 host：端口不同不等于跨站，把攻击站也改成 localhost 会改变 SameSite 的观察条件。浏览器隐私策略可能进一步限制 Cookie 携带，实际结果结合 Network 和终端请求日志判断。

Web Storage 与 IndexedDB 的跨标签实验需要同一浏览器配置下的真实标签页。origin 包含协议、host 与端口，随意切换 localhost/127.0.0.1 或端口会改变存储隔离范围。

存储管理依赖浏览器支持与安全上下文；localhost 可用于本地实验。刷新后数据可能保留，停止 Node 服务不会清除浏览器数据；需要复现初始状态时使用页面中的删除操作或 DevTools 按当前 origin 清理站点数据。

## 学习顺序

先用 Cookie 理解自动随请求发送，再比较 Web Storage 的同步键值与 IndexedDB 的异步事务，最后理解配额、持久化和回收。HTTP response 的缓存复用属于另一条机制，见[缓存实验](../cache/README.md)。
