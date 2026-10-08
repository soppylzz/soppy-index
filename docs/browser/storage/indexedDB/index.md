# IndexedDB 实验走查

[主题目录](./README.md) · [知识笔记](./indexedDB.md) · [实现](./index.ts)

[同目录的 `index.ts`](index.ts) 用零依赖的 `node:http` 提供一个实验页面，逻辑全部在浏览器端执行：

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
node docs/browser/storage/indexedDB/index.ts
```

在浏览器打开 <http://localhost:5002>。刷新和停止服务不会自动清除已存数据；需要重置时使用页面操作或 DevTools 清理当前 origin。

服务成功监听后，CLI 打印当前地址、实验步骤、观察位置及停止方式；终端记录 HTTP 请求与状态，页面和浏览器 Console 按发生顺序记录带时间戳的结果。服务只监听本机，HTML 使用 `no-store`。端口被占用时可切换：

```bash
PORT=5005 node docs/browser/storage/indexedDB/index.ts
```

切换端口会改变 origin，因此浏览器存储也会随之隔离。

下表为实验预期；实际结果需结合浏览器策略观察。

| 实验             | 操作                      | 观察                                                                           |
| ---------------- | ------------------------- | ------------------------------------------------------------------------------ |
| CRUD + 索引      | 添加 / 列表 / 删除笔记    | 列表来自 `by-updated-at` 索引的 `openCursor(null, "prev")` 倒序遍历            |
| request ≠ 事务   | 「两阶段日志」按钮        | 先看到 `put` request 成功，再看到 `transaction complete`，落库以后者为准       |
| 事务自动提交     | 「事务中 setTimeout」按钮 | 事件循环返回后事务已提交，新的 put 抛出 `TransactionInactiveError`             |
| structured clone | 三种类型实验按钮          | Date/Map/ArrayBuffer 原样读回；函数抛 `DataCloneError`；class 实例丢 prototype |
| schema 升级      | 「升级增加索引」按钮      | 索引只能在 `onupgradeneeded` 中创建，日志显示 oldVersion → newVersion          |

数据库按 origin 与名字组织，通常可跨刷新和浏览器重启保留；localStorage 也可持久化，IndexedDB 的主要区别在于异步事务和结构化数据能力。「删除数据库」按钮调用 `indexedDB.deleteDatabase` 用于重置。升级前先关闭本页旧连接，打开、升级和删除期间禁用操作按钮。其他标签收到 `versionchange` 时关闭连接并提示刷新；未释放的连接仍会使请求触发 `onblocked`。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。
