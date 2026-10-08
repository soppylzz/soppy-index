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

object store 和 index 的创建、删除只能在 versionchange transaction 中完成，通常写在 `onupgradeneeded`：

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

数据库版本只能使用正整数。升级代码会从旧版本直接执行到目标版本，所以真实项目应根据 `event.oldVersion` 逐步迁移，而不是只假设用户来自上一个版本。

其他标签页持有旧连接时，升级可能被阻塞。连接应监听 `versionchange` 并及时关闭：

```js
const database = await openNotesDatabase()

database.addEventListener("versionchange", () => {
  database.close()
})
```

## 3. 写入：以 transaction 完成为准

一次 `put()` request 成功，不等于整个 transaction 已提交。需要在 `transaction.oncomplete` 后再向上层报告成功：

```js
async function saveNote(note) {
  const database = await openNotesDatabase()

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
await saveNote(remoteNote)
```

transaction 应尽量短小，只包含需要原子完成的数据库操作。

## 4. 读取与索引

按主键读取：

```js
async function getNote(id) {
  const database = await openNotesDatabase()

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
async function getRecentNotes(limit = 20) {
  const database = await openNotesDatabase()

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

数据量小时可以使用 `getAll()`；结果很大或需要逐步处理时，cursor 避免一次把所有记录放入内存。

## 5. Structured clone 不等于任意值

IndexedDB 可保存对象、数组、`Date`、`Blob`、`ArrayBuffer` 等 structured-cloneable 值，不需要先转 JSON。函数、DOM node 和部分平台对象不能被克隆，会抛出 `DataCloneError`。

保存 class instance 后，不应期待其 prototype 方法在读取时自动恢复。数据库 schema 应使用明确的数据字段，行为逻辑放在应用代码中。

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
