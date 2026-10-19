# IndexedDB 实验走查

[实验页面](demo/lib/page.ts) 由 Next.js 提供一个实验页面，逻辑全部在浏览器端执行：

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
pnpm --filter indexeddb-next-lab dev
```

在浏览器打开 <http://localhost:5002>。刷新和停止服务不会自动清除已存数据；需要重置时使用页面操作或 DevTools 清理当前 origin。

Next CLI 输出服务地址；操作步骤见本文，结果在页面与浏览器 Console 观察。生产服务不保证逐条打印访问日志。服务只监听本机，HTML 使用 `no-store`。端口被占用时可切换：

```bash
pnpm --filter indexeddb-next-lab exec next dev -H 127.0.0.1 -p 5005
```

切换端口会改变 origin，因此浏览器存储也会随之隔离。

下表为实验预期；实际结果需结合浏览器策略观察。

| 实验 | 操作 | 观察 |
| --- | --- | --- |
| CRUD + 索引 | 添加 / 列表 / 删除笔记 | 列表来自 `by-updated-at` 索引的 `openCursor(null, "prev")` 倒序遍历 |
| request ≠ 事务 | 「两阶段日志」按钮 | 先看到 `put` request 成功，再看到 `transaction complete`，事务提交以后者为准 |
| 事务自动提交 | 「事务中 setTimeout」按钮 | 若回调执行时事务已自动提交，新的 put 抛出 `TransactionInactiveError`；结合 complete 与异常日志判断 |
| structured clone | 三种类型实验按钮 | Date/Map/ArrayBuffer 原样读回；函数抛 `DataCloneError`；class 实例丢 prototype |
| schema 升级 | 「升级增加索引」按钮 | 索引只能在 `onupgradeneeded` 中创建，日志显示 oldVersion → newVersion |

数据库按 origin 与名字组织，通常可跨刷新和浏览器重启保留；localStorage 也可持久化，IndexedDB 的主要区别在于异步事务和结构化数据能力。「删除数据库」按钮调用 `indexedDB.deleteDatabase` 用于重置。升级前先关闭本页旧连接，打开、升级和删除期间禁用操作按钮。其他标签收到 `versionchange` 时关闭连接并提示刷新；未释放的连接仍会使请求触发 `onblocked`。

源码入口是 init → openDb → attachVersionChange；添加、查询等操作复用页面级 db，升级则关闭旧连接再打开更高版本。blocked 不是立即失败，其他标签关闭旧连接后请求仍可继续。知识文档中的 notes-app 与本实验 idb-demo 是独立示例，初始化前提与调用者连接职责见 [打开数据库与 schema 升级](./indexedDB.md#2-打开数据库与-schema-升级)。

## 验证边界

本页保留已有实验的操作与预期，不将其自动视为本次浏览器实测。本次调整文档结构和代码摘录，没有重新执行这些存储实验；浏览器策略与实际结果仍需按步骤观察。

## 实现怎样控制实验条件

完整实现见 [实验页面](demo/lib/page.ts)。以下片段按源码流程精简，并将展示文字改为英文，用于解释实验输入和观察边界。

下面对应 [实验页面](demo/lib/page.ts) 中添加笔记的流程；`db` 是打开成功的连接，`title` 来自输入框，`log`、`renderNotes` 是页面辅助函数：

```js
const tx = db.transaction("notes", "readwrite")
tx.objectStore("notes").put({
  id: "n" + Date.now(),
  title,
  updatedAt: Date.now(),
})
tx.oncomplete = () => {
  log(`Saved "${title}" after transaction complete`)
  renderNotes()
}
tx.onerror = () => log("Write failed: " + tx.error)
```

「两阶段日志」在 put request 的 onsuccess 与 transaction 的 oncomplete 分别记录，便于观察请求完成和事务完成的区别。列表读取走 `index("by-updated-at").openCursor(null, "prev")`；schema 创建和事务封装见上文，按钮与升级阻塞的完整流程见走查。
