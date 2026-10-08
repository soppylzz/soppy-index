# IndexedDB

[主题目录](./README.md) · [实验走查](./index.md)

IndexedDB 是浏览器内置的异步事务数据库。它以 object store 保存可被 structured clone 的 JavaScript 值，支持 key、index、cursor 和 transaction，适合离线业务数据、大量结构化对象以及需要索引查询的客户端状态。

## 1. 核心对象

```text
IDBFactory（indexedDB）
  └─ IDBDatabase
       ├─ object store: notes
       │    ├─ primary key: id
       │    └─ index: by-updated-at
       └─ transaction
            └─ request -> result / error
```

| 对象               | 作用                             |
| ------------------ | -------------------------------- |
| `IDBOpenDBRequest` | 打开数据库并处理版本升级         |
| `IDBDatabase`      | 数据库连接，创建 transaction     |
| `IDBObjectStore`   | 按 key 保存与读取记录            |
| `IDBIndex`         | 对记录字段建立辅助索引           |
| `IDBTransaction`   | 定义操作范围、模式和原子提交边界 |
| `IDBRequest`       | 表示一次异步数据库操作           |
| `IDBCursor`        | 逐项遍历较大的结果集             |

IndexedDB 的异步模型主要基于 event，而不是原生 Promise。可以自己封装 Promise，也可以选择成熟库；无论采用哪种封装，都不能忽略 transaction 生命周期。

## 2. 打开数据库与 schema 升级

object store 和 index 的创建、删除只能在 versionchange transaction 中完成，通常写在 `onupgradeneeded`。以下是独立的 API 示例，使用 notes-app；本目录 demo 使用 idb-demo，二者不是同一个数据库：

```js
function openNotesDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("notes-app", 2)

    request.onupgradeneeded = () => {
      const database = request.result

      if (!database.objectStoreNames.contains("notes")) {
        const store = database.createObjectStore("notes", {
          keyPath: "id",
        })
        store.createIndex("by-updated-at", "updatedAt")
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => {
      console.warn("Database upgrade is blocked by another tab")
    }
  })
}
```

示例只覆盖 notes store 不存在时的初始化：若旧库已有 notes 但缺少索引，这个分支不会补建索引。完整迁移需在升级事务中取得已有 store，再按旧版本及 indexNames 判断需要的变更。数据库版本只能使用正整数；用户可能跨多个版本升级，应根据 event.oldVersion 执行所需迁移，不能只假设来自上一个版本。[IndexedDB 升级说明](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)

其他标签页持有旧连接时，升级可能被阻塞。连接应监听 `versionchange` 并及时关闭：

```js
const database = await openNotesDatabase()

database.addEventListener("versionchange", () => {
  database.close()
})
```

对应 [index.ts](./index.ts) 的实际流程是：`init()` 调用 `openDb(null, null)` 打开当前版本；openDb 在 onupgradeneeded 中初始化缺失的 store，并将升级事务中的 store 交给可选回调。`upgradeSchema()` 先关闭本页旧连接，再以 db.version + 1 重开，在回调中检查并创建 by-title 索引。其他标签通过 `attachVersionChange()` 关闭旧连接、禁用操作并提示刷新；若仍有连接未释放，发起方才需要处理 blocked。关闭本页连接不等于关闭了其他标签的连接。

这个 demo 用递增版本演示 schema 修改入口，不是完整的生产版本迁移器。blocked 表示仍在等待，不等于升级已经失败；versionchange 表示需要让出旧连接，也不表示升级方已经提交成功。

## 3. 写入：以 transaction 完成为准

一次 `put()` request 成功，不等于整个 transaction 已提交。需要在 `transaction.oncomplete` 后再向上层报告成功。下面的读写函数接收已打开的 database，连接由调用者复用或在不再使用时关闭：

```js
function saveNote(database, note) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("notes", "readwrite")
    const store = transaction.objectStore("notes")

    store.put({
      ...note,
      updatedAt: Date.now(),
    })

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
```

同一 transaction 中的操作要连续排入队列。不要在 transaction 中间等待 `fetch()` 或其他无关异步工作；事件循环回到外部后，transaction 可能因没有待处理 request 而自动提交。

```js
// Fetch first, then open a short database transaction.
const remoteNote = await fetch("/api/note/42").then((response) => response.json())
const database = await openNotesDatabase()
try {
  await saveNote(database, remoteNote)
} finally {
  database.close()
}
```

这里展示一次操作结束后关闭连接；长期运行的应用也可以持有连接，但需处理 versionchange 并明确关闭职责。完整 demo 复用页面级 db，而不是每次按钮操作都重新打开。transaction 应尽量短小，只包含需要原子完成的数据库操作；异步等待前先取得远端数据，不要把“所有 await 都导致事务失效”当作规则。

## 4. 读取与索引

按主键读取，仍使用调用者管理的连接：

```js
function getNote(database, id) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("notes", "readonly")
    const request = transaction.objectStore("notes").get(id)

    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}
```

按索引获取最近更新的数据：

```js
function getRecentNotes(database, limit = 20) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction("notes", "readonly")
    const index = transaction.objectStore("notes").index("by-updated-at")
    const request = index.openCursor(null, "prev")
    const notes = []

    request.onsuccess = () => {
      const cursor = request.result

      if (!cursor || notes.length >= limit) {
        resolve(notes)
        return
      }

      notes.push(cursor.value)
      cursor.continue()
    }

    request.onerror = () => reject(request.error)
  })
}
```

这两个读取函数返回查询结果；它们的 request 成功不应套用成写入事务提交的证据。getRecentNotes 在达到 limit 后停止继续游标，限制本次结果数量。数据量小时可以使用 getAll；较大结果集可用 cursor 逐步读取，但若不断把 cursor.value 推入数组而不设上限，仍会累积全部结果，并不会自动节省结果内存。

## 5. Structured clone 不等于任意值

IndexedDB 按存储用途序列化值，不需要先转 JSON。通用类型与原型边界见 [常用 Web API](../../api/webApi.md#2-url-与结构化克隆)；具体值仍须满足 IndexedDB 的存储序列化规则。add / put 没有 transfer list 参数，不能将消息端口或 buffer 所有权交付的用法套进数据库写入。[IndexedDB 存储算法](https://w3c.github.io/IndexedDB/#clone-a-value)

对应 [index.ts](./index.ts) 的三个实验：demoCloneRich 在事务 complete 后读回并检查 Date、Map、ArrayBuffer；demoCloneFn 捕获 put 函数值时的 DataCloneError；demoCloneClass 对照读回对象的 instanceof 与 dist 方法，说明字段保存不等于类行为恢复。这些检查回答“能保存和读回什么”，写入是否提交仍看事务结果。

数据库 schema 应使用明确的数据字段。读回后需要类行为时，由应用按数据版本校验和重建，不能期待 prototype 方法自动恢复；也不能用一次本地 structuredClone 成功代替数据库的真实写入与读回。

## 6. Demo 核心实现

运行、操作步骤与预期见[实验走查](./index.md)，完整实现见 [index.ts](./index.ts)。

下面对应 [index.ts](./index.ts) 中添加笔记的流程；`db` 是打开成功的连接，`title` 来自输入框，`log`、`renderNotes` 是页面辅助函数：

```js
const tx = db.transaction("notes", "readwrite")
tx.objectStore("notes").put({
  id: "n" + Date.now(),
  title,
  updatedAt: Date.now(),
})
tx.oncomplete = () => {
  log(`已写入「${title}」（transaction complete 后才确认成功）`)
  renderNotes()
}
tx.onerror = () => log("写入失败：" + tx.error)
```

「两阶段日志」在 put request 的 onsuccess 与 transaction 的 oncomplete 分别记录，便于观察请求完成和事务完成的区别。列表读取走 `index("by-updated-at").openCursor(null, "prev")`；schema 创建和事务封装见上文，按钮与升级阻塞的完整流程见走查。

## 7. 错误、关闭与删除

- 捕获 request 和 transaction 错误，向用户提供重试或降级。
- 页面长时间运行时监听 `versionchange`，避免阻塞其他标签页升级。
- `database.close()` 只关闭连接，不删除数据。
- `indexedDB.deleteDatabase(name)` 会请求删除整个数据库，也可能被其他连接阻塞。
- 写入仍受 origin 配额和回收策略影响，详见[存储管理](../storageManagement/README.md)。

数据库迁移必须考虑中断：一次升级失败时 transaction 会回滚，但应用仍要能处理旧 schema、损坏数据或用户清空数据后的首次启动。

## 8. 兼容性与封装

IndexedDB 在现代浏览器中已广泛支持。复杂度主要来自 event API、transaction 生命周期和 schema 迁移，而不是基础兼容性。

实际项目可使用基于 IndexedDB 的轻量 Promise 封装，但要确认它如何处理 upgrade、blocked、versionchange 与 transaction。不能因为 API 变成 `await` 就把任意网络等待放进 transaction。

兼容性见 [MDN：IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API#browser_compatibility) 和 [MDN：Using IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB)。

## 9. 面试回答框架

先说明 IndexedDB 是异步事务数据库，而 localStorage 是同步字符串键值存储；再介绍 object store、index 和 transaction；然后说明 schema 只能在 `onupgradeneeded` 中修改；最后强调 request 成功不等于 transaction 提交，以及 transaction 中不应穿插无关异步等待。可结合本目录 demo 的两阶段日志与 TransactionInactiveError 实验说明。

## 10. 参考资料

- [Indexed Database API specification](https://w3c.github.io/IndexedDB/)
- [MDN：IDBTransaction](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction)
- [MDN：The structured clone algorithm](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm)
