# Web Storage

[返回存储目录](../README.md) · [仓库首页](../../../../README.md)

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

## 2. 可运行 Demo：一个页面看懂两者差异

[同目录的 `index.ts`](index.ts) 用零依赖的 `node:http` 提供一个实验页面，逻辑全部在浏览器端执行，按页面上的步骤操作即可：

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
node docs/browser/storage/webStorage/index.ts
```

在浏览器打开 <http://localhost:4000>。刷新和停止服务不会自动清除已存数据；需要重置时使用页面操作或 DevTools 清理当前 origin。

服务成功监听后，CLI 打印当前地址、实验步骤、观察位置及停止方式；终端记录 HTTP 请求与状态，页面和浏览器 Console 按发生顺序记录带时间戳的结果。服务只监听本机，HTML 使用 `no-store`。端口被占用时可切换：

```bash
PORT=5005 node docs/browser/storage/webStorage/index.ts
```

切换端口会改变 origin，因此浏览器存储也会随之隔离。

| 实验 | 操作                      | 现象                                              | 对应差异                                    |
| ---- | ------------------------- | ------------------------------------------------- | ------------------------------------------- |
| 1    | 向两种存储各写一条        | 两张表格同步更新                                  | API 完全相同                                |
| 2    | 点击「重新加载本页」      | 两者都保留                                        | sessionStorage 的生命周期是页面会话而非页面 |
| 3    | 点击「打开第二个标签页」  | 新标签 localStorage 可见，sessionStorage 为空     | 隔离范围：origin vs origin + 页面会话       |
| 4    | 在标签 A 写入，切到标签 B | 仅 localStorage 触发 `storage` 事件，A 自己收不到 | 跨标签同步 + 事件只发给其他文档             |
| 5    | 关闭浏览器重新访问        | sessionStorage 清空，localStorage 仍在            | 生命周期                                    |

页面另有一个「写入 6MB」按钮，用于触发 `QuotaExceededError`，感受约 5MB 的配额量级。

> 实验需要两个真实标签页，请在 Chrome/Firefox 中打开。页面按钮使用 `noopener`，避免新页复制 opener 的 sessionStorage。手动保留 opener 打开页面时仍需考虑第 1 节的复制语义；会话恢复行为也受浏览器策略影响。

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

同一 origin 的另一个文档修改 Web Storage 时，相关窗口会收到 `storage` 事件。发起修改的当前文档不会收到自己的事件。

```js
window.addEventListener("storage", (event) => {
  if (event.storageArea !== localStorage || event.key !== "theme") {
    return
  }

  applyTheme(event.newValue ?? "system")
})
```

该事件适合通知"某个值已改变"，不适合承担可靠消息队列：页面可能未打开，连续写入也不提供消息确认、重放或事务语义。事件的投递条件见 [MDN：Storage event](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)。

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
