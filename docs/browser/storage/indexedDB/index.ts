import {
  demoHead,
  readPort,
  serveDemoAsset,
  startServer,
  logHttpRequest,
} from "../../../demo/server.ts"
import { createServer, type IncomingMessage, type ServerResponse } from "node:http"

/* ==================== config ==================== */

const PORT = readPort("PORT", 5002, true)

/* ==================== page ==================== */

const PAGE = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>IndexedDB Demo — 事务、索引与 structured clone</title>
${demoHead}
</head>
<body class="demo-page"><main>
<h1>IndexedDB Demo</h1>

<div class="card">
  <strong>数据库状态</strong>
  <p id="db-status" class="muted">打开中……</p>
</div>

<div class="card">
  <p><strong>笔记 CRUD</strong> <span class="muted">（写入以 transaction complete 为准；列表来自 by-updated-at 索引的 cursor 倒序遍历，最多 5 条）</span></p>
  <p>
    <input id="title" placeholder="笔记标题" size="24">
    <button onclick="addNote()">添加</button>
  </p>
  <table><tbody id="note-rows"></tbody></table>
</div>

<div class="card">
  <p><strong>事务语义</strong></p>
  <button onclick="demoTwoPhase()">两阶段日志：request 成功 vs 事务提交</button>
  <button onclick="demoAutoCommit()">在事务中 setTimeout 再写入</button>
</div>

<div class="card">
  <p><strong>structured clone</strong></p>
  <button onclick="demoCloneRich()">存读 Date / Map / ArrayBuffer</button>
  <button onclick="demoCloneFn()">存含函数的对象</button>
  <button onclick="demoCloneClass()">存 class 实例</button>
</div>

<div class="card">
  <p><strong>schema 升级</strong> <span class="muted">（索引只能在 onupgradeneeded 中创建）</span></p>
  <button id="upgrade-btn" onclick="upgradeSchema()">升级</button>
</div>

<div class="card">
  <button onclick="deleteDatabaseAll()">删除数据库（indexedDB.deleteDatabase）</button>
</div>

<div class="card">
  <p><strong>日志</strong></p>
  <ul class="demo-log" id="log" role="log" aria-live="polite"></ul>
</div>

<script>
  var logEl = document.getElementById("log")
  var db = null

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
  }

  const log = globalThis.Demo.createLogger(logEl, { limit: 40, clock: "relative", console: true })

  function fmtTime(ts) {
    return new Date(ts).toLocaleTimeString()
  }

  function requestToPromise(request) {
    return new Promise(function (resolve, reject) {
      request.onsuccess = function () { resolve(request.result) }
      request.onerror = function () { reject(request.error) }
    })
  }

  function openDb(version, onUpgrade) {
    return new Promise(function (resolve, reject) {
      var request = version ? indexedDB.open("idb-demo", version) : indexedDB.open("idb-demo")
      request.onupgradeneeded = function (event) {
        log("onupgradeneeded：v" + event.oldVersion + " → v" + event.newVersion)
        var database = request.result
        if (!database.objectStoreNames.contains("notes")) {
          var store = database.createObjectStore("notes", { keyPath: "id" })
          store.createIndex("by-updated-at", "updatedAt")
          log("onupgradeneeded 中创建 store notes 与索引 by-updated-at")
        }
        if (onUpgrade) onUpgrade(request.transaction.objectStore("notes"))
      }
      request.onsuccess = function () { resolve(request.result) }
      request.onerror = function () { reject(request.error) }
      request.onblocked = function () {
        log("onblocked：升级被其他标签页的旧连接阻塞（真实应用应在 versionchange 中及时 close）")
      }
    })
  }

  function renderStatus() {
    var store = db.transaction("notes", "readonly").objectStore("notes")
    var indexes = []
    for (var i = 0; i < store.indexNames.length; i++) indexes.push(store.indexNames[i])
    document.getElementById("db-status").innerHTML =
      "数据库 <code>idb-demo</code> · v" + db.version +
      " · store <code>notes</code>（keyPath: id）· 索引：<code>" +
      esc(indexes.join(", ")) + "</code>"
  }

  function refreshUpgradeButton() {
    var button = document.getElementById("upgrade-btn")
    var store = db.transaction("notes", "readonly").objectStore("notes")
    if (store.indexNames.contains("by-title")) {
      button.disabled = true
      button.textContent = "by-title 索引已存在（升级完成）"
    } else {
      button.disabled = false
      button.textContent = "升级 schema（v" + db.version + " → v" + (db.version + 1) + "）：增加 by-title 索引"
    }
  }

  function renderNotes() {
    var tx = db.transaction("notes", "readonly")
    var request = tx.objectStore("notes").index("by-updated-at").openCursor(null, "prev")
    var notes = []
    request.onsuccess = function () {
      var cursor = request.result
      if (!cursor || notes.length >= 5) {
        var html = ""
        for (var i = 0; i < notes.length; i++) {
          html +=
            "<tr><td><code>" + esc(notes[i].id) + "</code></td>" +
            "<td>" + esc(notes[i].title) + "</td>" +
            '<td class="muted">' + fmtTime(notes[i].updatedAt) + "</td>" +
            '<td><button data-id="' + esc(notes[i].id) + '" onclick="deleteNote(this.dataset.id)">删除</button></td></tr>'
        }
        document.getElementById("note-rows").innerHTML =
          html || '<tr><td colspan="4" class="muted">(空)</td></tr>'
        return
      }
      notes.push(cursor.value)
      cursor.continue()
    }
  }

  function addNote() {
    var title = document.getElementById("title").value.trim()
    if (!title) {
      log("请输入标题")
      return
    }
    var tx = db.transaction("notes", "readwrite")
    tx.objectStore("notes").put({ id: "n" + Date.now(), title: title, updatedAt: Date.now() })
    tx.oncomplete = function () {
      log("已写入「" + title + "」（transaction complete 后才确认成功）")
      renderNotes()
    }
    tx.onerror = function () { log("写入失败：" + tx.error) }
  }

  function deleteNote(id) {
    var tx = db.transaction("notes", "readwrite")
    tx.objectStore("notes").delete(id)
    tx.oncomplete = function () {
      log("已删除 " + id)
      renderNotes()
    }
  }

  function demoTwoPhase() {
    var tx = db.transaction("notes", "readwrite")
    var request = tx.objectStore("notes").put({
      id: "t" + Date.now(),
      title: "两阶段写入",
      updatedAt: Date.now(),
    })
    request.onsuccess = function () {
      log("① put request 成功——事务还没有提交，此时报成功为时过早")
    }
    tx.oncomplete = function () {
      log("② transaction complete——事务已提交，可报告事务成功；这不等于强制刷盘保证")
      renderNotes()
    }
    tx.onerror = function () { log("事务失败：" + tx.error) }
  }

  function demoAutoCommit() {
    var tx = db.transaction("notes", "readwrite")
    var store = tx.objectStore("notes")
    store.put({ id: "a" + Date.now(), title: "队列中的写入", updatedAt: Date.now() })
    tx.oncomplete = function () {
      log("事务已提交：事件循环返回时没有排队中的 request，事务自动结束")
    }
    setTimeout(function () {
      try {
        store.put({ id: "late", title: "迟到写入", updatedAt: Date.now() })
        log("？迟到写入竟然成功了")
      } catch (error) {
        log("回到事件循环后再 put 抛出 " + error.name + "——不要在事务中等待 fetch/setTimeout 等无关异步工作")
      }
      renderNotes()
    }, 100)
  }

  function demoCloneRich() {
    var value = {
      id: "c1",
      title: "rich",
      updatedAt: Date.now(),
      createdAt: new Date(),
      tags: new Map([["lang", "ts"]]),
      buffer: new Uint8Array([1, 2, 3]).buffer,
    }
    var tx = db.transaction("notes", "readwrite")
    tx.objectStore("notes").put(value)
    tx.oncomplete = function () {
      requestToPromise(db.transaction("notes", "readonly").objectStore("notes").get("c1")).then(
        function (v) {
          log(
            "读回类型：createdAt instanceof Date → " + (v.createdAt instanceof Date) +
            "，tags instanceof Map → " + (v.tags instanceof Map) +
            "，buffer.byteLength → " + v.buffer.byteLength
          )
          renderNotes()
        }
      )
    }
  }

  function demoCloneFn() {
    try {
      var tx = db.transaction("notes", "readwrite")
      tx.objectStore("notes").put({ id: "bad", title: function () {} })
      log("？函数竟然写入成功")
    } catch (error) {
      log("put 含函数的对象同步抛出 " + error.name + "：函数与 DOM 节点无法 structured clone")
    }
  }

  function Point(x, y) {
    this.x = x
    this.y = y
  }
  Point.prototype.dist = function () {
    return Math.hypot(this.x, this.y)
  }

  function demoCloneClass() {
    var tx = db.transaction("notes", "readwrite")
    tx.objectStore("notes").put(Object.assign(new Point(3, 4), { id: "p1" }))
    tx.oncomplete = function () {
      requestToPromise(db.transaction("notes", "readonly").objectStore("notes").get("p1")).then(
        function (v) {
          log(
            "读回后 instanceof Point → " + (v instanceof Point) +
            "，typeof v.dist → " + typeof v.dist +
            "（只剩数据字段 x=" + v.x + " y=" + v.y + "，行为要由应用代码恢复）"
          )
        }
      )
    }
  }

  function setReady(ready) {
    document.querySelectorAll("button").forEach(function (button) { button.disabled = !ready })
  }

  function upgradeSchema() {
    var nextVersion = db.version + 1
    db.close()
    db = null
    setReady(false)
    openDb(nextVersion, function (store) {
      if (!store.indexNames.contains("by-title")) {
        store.createIndex("by-title", "title")
        log("onupgradeneeded 中创建索引 by-title")
      }
    }).then(function (database) {
      db = database
      setReady(true)
      attachVersionChange()
      renderStatus()
      refreshUpgradeButton()
      log("升级完成：schema 变更只能发生在 onupgradeneeded，普通事务中 createIndex 会抛错")
    }).catch(function (error) {
      log("升级失败：" + error)
    })
  }

  function deleteDatabaseAll() {
    db.close()
    db = null
    setReady(false)
    var request = indexedDB.deleteDatabase("idb-demo")
    request.onsuccess = function () {
      log("数据库已删除")
      init()
    }
    request.onerror = function () { log("删除失败：" + request.error) }
    request.onblocked = function () { log("删除被其他连接阻塞") }
  }

  function attachVersionChange() {
    db.addEventListener("versionchange", function () {
      log("收到 versionchange：其他标签页在升级，本连接主动 close")
      db.close()
      db = null
      setReady(false)
      document.getElementById("db-status").textContent = "连接已关闭；请刷新页面以重新打开"
    })
  }

  function init() {
    setReady(false)
    openDb(null, null).then(function (database) {
      db = database
      setReady(true)
      attachVersionChange()
      renderStatus()
      refreshUpgradeButton()
      renderNotes()
      log("数据库已打开：连接只负责创建 transaction，所有读写都在事务里")
    }).catch(function (error) {
      log("打开失败：" + error)
    })
  }

  window.addEventListener("error", function (event) { log("操作失败：" + event.message) })
  window.addEventListener("unhandledrejection", function (event) { log("异步操作失败：" + event.reason) })
  init()
</script>
</main></body>
</html>`

/* ==================== demo ==================== */

const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (serveDemoAsset(req, res)) return
  const url = new URL(req.url ?? "/", "http://localhost")
  res.on("finish", () => logHttpRequest(req, res.statusCode, "indexedDB"))
  res.setHeader("Cache-Control", "no-store")
  if (url.pathname === "/favicon.ico") {
    res.writeHead(204)
    res.end()
    return
  }
  if (url.pathname !== "/") {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" })
    res.end("Not found")
    return
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" })
    res.end("Method not allowed")
    return
  }
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" })
  res.end(req.method === "HEAD" ? undefined : PAGE)
})

startServer(server, PORT, () => {
  const address = server.address()
  if (!address || typeof address === "string") return
  console.log(`indexedDB demo
  open http://localhost:${address.port} in a modern browser
  press Ctrl+C to stop; use PORT=5005 to choose another port

steps:
  1. wait for the database to open, then add, list, and delete notes
  2. compare put request success with transaction complete
  3. try a delayed write after the transaction becomes inactive
  4. round-trip Date/Map/ArrayBuffer; compare functions and class instances
  5. upgrade the schema, then open another tab to observe versionchange
  6. use Delete database to reset the experiment

notes:
  - writes are confirmed at transaction complete, not request success
  - upgrades close this page's old connection before requesting a new version
  - other tabs close on versionchange; reload them to reopen the database
  - data normally survives reloads; stopping the server does not clear it

observations:
  - the terminal prints HTTP requests and response status
  - the page and browser Console print timestamped experiment results
  - walkthrough: docs/browser/storage/indexedDB/README.md`)
})

export {}
