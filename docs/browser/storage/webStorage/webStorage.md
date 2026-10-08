# Web Storage

[主题目录](./README.md) · [实验走查](./index.md)

Web Storage 提供 `localStorage` 和 `sessionStorage` 两个同步字符串键值容器。它们 API 相似，主要区别是生命周期和分区方式；两者都不适合大对象、高频写入或需要事务的场景。

## 1. localStorage 与 sessionStorage

| 对比项              | `localStorage`                    | `sessionStorage`                                     |
| ------------------- | --------------------------------- | ---------------------------------------------------- |
| 基本隔离            | origin                            | origin + 顶层浏览上下文的页面会话                    |
| 生命周期            | 通常跨关闭、重开保存              | 页面会话结束后清除                                   |
| 同标签页同源 iframe | 可访问同一 origin 的 localStorage | 可访问对应 origin、当前顶层上下文下的 sessionStorage |
| 跨标签页同步        | 可通过 `storage` 事件观察变化     | 不用于普通标签页间共享                               |
| API                 | 同步字符串 API                    | 同步字符串 API                                       |

`sessionStorage` 中的"session"指页面会话，不是服务端登录 session。通过 `window.open` 打开的新页面若保留 opener，可能初始复制 opener 的 `sessionStorage`，之后两边独立修改；需要隔离时使用 `noopener`。

## 2. Demo 核心实现

运行、操作步骤与预期见[实验走查](./index.md)，完整实现见 [index.ts](./index.ts)。

下面对应 [index.ts](./index.ts) 的存储读写与开新页操作，省略表格更新和错误日志；`key`、`value` 由输入框取得，完整 demo 在 try/catch 中处理不可写情况：

```js
localStorage.setItem(key, value)
sessionStorage.setItem(key, value)
window.open(location.href, "_blank", "noopener")

window.addEventListener("storage", (event) => {
  const area = event.storageArea === localStorage ? "localStorage" : "sessionStorage"
  log(`收到其他文档的 ${area} 事件：${event.key} ${event.oldValue} → ${event.newValue}`)
  render()
})
```

`log` 和 `render` 是源码中的有界日志与表格辅助函数；新页通过 sessionStorage 生成自己的 tabId。监听会记录真正的 storage 事件，写入页的表格则由操作函数主动更新，两者不能混为一谈。需要 request id / ack 的完整通信对照见[通信实验](../../communication/crossContextCommunication.md)。

## 3. 基本使用与序列化

Web Storage 只保存字符串。对象需要显式序列化，并处理数据不存在、旧版本或损坏的情况：

```js
const PREFERENCE_KEY = "preferences:v2"

function savePreferences(preferences) {
  try {
    localStorage.setItem(PREFERENCE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.error("Failed to save preferences", error)
  }
}

function loadPreferences() {
  try {
    const value = localStorage.getItem(PREFERENCE_KEY)
    return value === null ? null : JSON.parse(value)
  } catch (error) {
    console.error("Failed to load preferences", error)
    return null
  }
}
```

key 中保留 schema 版本是一种简单迁移方式。更复杂、数据量更大的升级应使用 IndexedDB 的 versionchange transaction。

即使读取也可能因环境策略抛出 `SecurityError`，写入还可能因配额不足抛出 `QuotaExceededError`。不要假设 `localStorage` 永远存在、永远可写。

## 4. storage 事件

`storage` 事件通知共享同一存储区的其他 Window，发起修改的文档不会收到自己的事件。两种存储的接收范围不同：

| 存储区         | 接收范围                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------- |
| localStorage   | 共享该存储区的其他同源文档，可包括其他标签页与同源 iframe                                         |
| sessionStorage | 同一顶层浏览上下文中共享该会话存储区的其他同源文档，例如同标签页的同源 iframe；不传播到独立标签页 |

同源访问仍可能受到第三方存储分区及浏览器策略限制，不能只比较 URL 就推断共享。写入相同值不会产生变化事件；removeItem 删除已有 key 时 newValue 为 null，clear 改变存储区时 key 为 null。[storage 事件说明](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)

```js
window.addEventListener("storage", (event) => {
  if (event.storageArea !== localStorage || event.key !== "theme") {
    return
  }

  applyTheme(event.newValue ?? "system")
})
```

片段只订阅 localStorage 的 theme。完整 demo 的操作函数在写入后主动 render 本页，另一个文档则在 storage 监听中 render；所以本页表格更新不是收到自己事件的证据。事件适合通知“某个值已改变”，不提供消息确认、重放或跨窗口读改写事务。以 JSON 包装 request / ack 的流程见 [通信笔记](../../communication/crossContextCommunication.md#storage-event存储变化的副作用)。

## 5. 同步 API 的成本

`getItem`、`setItem`、序列化和反序列化都发生在调用线程。小型、低频偏好通常没有问题，但大型 JSON 或高频写入会阻塞主线程。

以下做法应避免：

```js
// Avoid writing large state on every input event.
input.addEventListener("input", () => {
  localStorage.setItem("editor-state", JSON.stringify(largeState))
})
```

可以对小型草稿进行 debounce；数据规模、查询或一致性要求继续增长时，迁移到 IndexedDB，而不是不断给 localStorage 封装更多数据库能力。

## 6. 生命周期与清理

- `localStorage.removeItem(key)` 删除单项。
- `localStorage.clear()` 删除当前 origin 容器中的全部项，库代码通常不应擅自调用。
- 隐私模式、用户清理站点数据或浏览器策略可能让"持久"数据消失。
- `sessionStorage` 通常会在关闭对应页面会话后清除，但崩溃恢复和浏览器恢复功能可能影响用户观察到的生命周期。

客户端数据应被视为可丢失。真正的业务事实需要服务端或其他可靠来源；本地副本应有重建路径。

## 7. 安全边界

同源脚本可以读取 Web Storage，所以不要在其中放长期密钥、明文密码或希望对 XSS 保密的凭证。Web Storage 不会自动随请求发送，这减少了 Cookie 式 CSRF 的一个条件，却不会消除 XSS 风险。

origin 隔离也不代表同一站点所有代码都可信。第三方脚本一旦在页面 origin 下执行，就拥有与业务代码相近的读取能力。

## 8. 兼容性与降级

Web Storage 的基础 API 已广泛支持，但第三方上下文、用户禁用持久化或隐私模式下可能受限。访问时应捕获异常，而不是只检测 `"localStorage" in window`。

兼容性见 [MDN：Web Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API#browser_compatibility)、[MDN：Window.localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage#browser_compatibility) 和 [MDN：Window.sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage#browser_compatibility)。

## 9. 面试回答框架

先说两者都是同步字符串 API；再比较 localStorage 的 origin 持久范围与 sessionStorage 的 origin + 页面会话范围，可用本目录 demo 的双标签实验说明；然后补充主线程阻塞、异常和 `storage` 事件；最后说明它们不适合大量结构化数据或敏感凭证。

## 10. 参考资料

- [HTML Standard：Web storage](https://html.spec.whatwg.org/multipage/webstorage.html)
- [MDN：Storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)
