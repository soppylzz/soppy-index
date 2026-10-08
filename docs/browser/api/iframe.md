# iframe：独立上下文与访问边界

[模块导航](./README.md) · [实验走查](./index.md) · [跨上下文通信](../communication/README.md)

## 1. 独立文档，不是普通 DOM 子树

iframe 建立嵌套浏览上下文，拥有自己的 Window、Document、事件路径和生命周期。父文档中的 iframe 元素是容器，不意味着其子文档节点属于父文档的 DOM 树。子文档 click 不自动冒泡到父文档 document；需要显式消息转发时，应定义消息协议。

同源判断涉及协议、主机和端口。即使都是本机，同端口与不同端口的访问能力也不同。跨源可持有 contentWindow 这类受限制窗口引用，但不能借此自由读取 document。CORS 控制特定资源请求，不能将跨源 iframe 的 DOM 变成可随意读取。[iframe 官方文档](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)

`/iframe` 提供三种真实文档：

| 文档   | 配置                              | 本实验中的访问边界                             |
| ------ | --------------------------------- | ---------------------------------------------- |
| same   | 主源 5013，无 sandbox             | 父页可读 DOM                                   |
| cross  | 对端源 5014，无 sandbox           | 读 DOM 拒绝，用显式消息                        |
| opaque | 主源 URL，sandbox="allow-scripts" | 允许脚本，但使用不透明 origin，父页读 DOM 拒绝 |

以下为核心读取方式，省略按钮绑定、等待就绪和异常日志。实际 origin 按端口配置生成：

```js
for (const frame of [same, cross, opaque]) {
  try {
    log(frame.contentWindow.document.querySelector("#frame-label").textContent)
  } catch (error) {
    log(`DOM 读取拒绝：${error.name}`)
  }
}
```

## 2. sandbox、Permissions Policy 与用户权限

空 sandbox 施加多类限制，再通过 token 逐项开放。allow-scripts 允许脚本执行，不恢复同源身份；allow-same-origin 保留原始来源身份，不表示 iframe 与父页面一定同源。同源不可信内容若同时开放脚本和同源身份，可能有机会移除自身 sandbox 并在后续导航逃离限制，不宜将其视为可靠隔离。[HTML sandbox 标准](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox)

iframe 的 allow 用于配置 Permissions Policy，与 sandbox 的职责不同；它仍不能绕过浏览器支持、顶层策略和用户权限。具体可嵌入性还可能受被嵌页面的 CSP frame-ancestors、X-Frame-Options 等限制。本实验允许自己的两源互相嵌入，没有开启外部权限能力。

不透明 origin 序列化为 "null"，这个字符串不是一个可唯一认证的来源。实验父页明确拒绝 opaque 消息，未用接受任意 "null" 来源的方式建立信任，也不向不透明接收方发送消息。

## 3. load、脚本就绪与业务 ack

iframe load 是容器加载相关事件，不能证明应用监听已注册，更不能证明请求已处理。本实验子文档先报告 ready；父页注册晚于子页时，会用精确来源发送 hello 让已运行的子页再次报告就绪。重载后清理旧 request id 和超时，等待新文档 ready。

跨源子文档只接受可信父窗口、精确 origin 和合法 probe；以下摘取 [frame.js](./assets/frame.js) 的处理分支，省略 hello、日志、监听清理和完整字段约束：

```js
window.addEventListener("message", (event) => {
  if (event.origin !== parentOrigin || event.source !== window.parent) return
  const data = event.data
  if (!data || typeof data !== "object" || data.kind !== "probe" || typeof data.id !== "string") {
    return
  }
  window.parent.postMessage({ kind: "ack", role: "cross", id: data.id, ok: true }, parentOrigin)
})
```

完整实现限制 id 长度，父页也按 iframe 的 contentWindow、预期 origin、role、kind、id、ok 校验。合法消息由子页处理后回 ack；非法 id 数字由子页拒绝并记录，父页在 1500ms 后报告未收到确认。超时是应用策略，不证明子页未收到。[postMessage 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

子页使用外置 defer classic script，便于 allow-scripts 的不透明上下文直接加载；它不依赖 module 的 CORS 获取。这里没有放宽消息来源检查。其他窗口伪造 origin/source、transferable、端口和完整可靠性机制见 [通信笔记](../communication/crossContextCommunication.md)。

## 4. 存储、性能与生命周期

不同端口是跨源但不必然跨站；本地双源实验不能验证真实第三方 Cookie 与跨站存储分区。相关策略见 [Cookie](../storage/cookie/README.md)、[Web Storage](../storage/webStorage/README.md)与 [存储管理](../storage/README.md)。

每个 iframe 带来独立解析、脚本和渲染成本。非首屏内容可考虑 loading="lazy" 并预留尺寸，但浏览器懒加载策略不等于固定延迟，本 demo 为明确实验顺序采用正常加载。父页生命周期监听也不能替代子文档自己的资源清理。

当前实验父页离开会移除 message / load / click 监听并清理 pending 超时；子页离开会移除自身监听。BFCache 恢复时重新建立监听。实际恢复受浏览器策略影响，不能假定页面关闭必达某个事件；详见 [生命周期](../core/lifeCycle/README.md)。
