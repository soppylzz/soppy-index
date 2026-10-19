# iframe：独立上下文与访问边界

iframe 看起来嵌在父页面里，为什么子页点击不会直接冒泡给父页，跨源时又不能直接读取它的 DOM？它装载的是另一份文档。理解这个前提后，才能区分文档访问限制、能力限制以及父子应用自己的通信协议。

## 1. 独立文档，不是普通 DOM 子树

iframe 建立嵌套浏览上下文，拥有自己的 Window、Document、事件路径和生命周期。父文档中的 iframe 元素是容器，不意味着其子文档节点属于父文档的 DOM 树。子文档 click 不自动冒泡到父文档 document；需要显式消息转发时，应定义消息协议。

同源判断涉及协议、主机和端口。即使都是本机，同端口与不同端口的访问能力也不同。跨源可持有 contentWindow 这类受限制窗口引用，但不能借此自由读取 document。CORS 控制特定资源请求，不能将跨源 iframe 的 DOM 变成可随意读取。[iframe 官方文档](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/iframe)

`/iframe` 提供三种真实文档：

| 文档   | 配置                              | 本实验中的访问边界                             |
| ------ | --------------------------------- | ---------------------------------------------- |
| same   | 主源 5013，无 sandbox             | 父页可读 DOM                                   |
| cross  | 对端源 5014，无 sandbox           | 读 DOM 拒绝，用显式消息                        |
| opaque | 主源 URL，sandbox="allow-scripts" | 允许脚本，但使用不透明 origin，父页读 DOM 拒绝 |

以下按源码流程精简，展示文字改为英文，省略按钮绑定、等待就绪和其他异常日志。实际 origin 按端口配置生成：

```js
for (const frame of [same, cross, opaque]) {
  try {
    log(frame.contentWindow.document.querySelector("#frame-label").textContent)
  } catch (error) {
    log(`DOM access denied: ${error.name}`)
  }
}
```

## 2. sandbox、Permissions Policy 与用户权限

空 sandbox 施加多类限制，再通过 token 逐项开放。allow-scripts 允许脚本执行，不恢复同源身份；allow-same-origin 保留原始来源身份，不表示 iframe 与父页面一定同源。同源不可信内容若同时开放脚本和同源身份，可能有机会移除自身 sandbox 并在后续导航逃离限制，不宜将其视为可靠隔离。[HTML sandbox 标准](https://html.spec.whatwg.org/multipage/iframe-embed-object.html#attr-iframe-sandbox)

iframe 的 allow 用于配置 Permissions Policy，与 sandbox 的职责不同；它仍不能绕过浏览器支持、顶层策略和用户权限。具体可嵌入性还可能受被嵌页面的 CSP frame-ancestors、X-Frame-Options 等限制。本实验允许自己的两源互相嵌入，没有开启外部权限能力。

不透明 origin 序列化为 "null"，这个字符串不是一个可唯一认证的来源。实验父页明确拒绝 opaque 消息，未用接受任意 "null" 来源的方式建立信任，也不向不透明接收方发送消息。

## 3. load、脚本就绪与业务 ack

iframe load 是容器加载相关事件，不能证明应用监听已注册，更不能证明请求已处理。本节关注父页如何确认子文档已准备好；消息校验、确认与超时的通用设计见 [通信笔记](../communication/cross-context-communication.md#消息发出不等于业务完成)。

父子页面的握手可以按以下步骤组织：

1. 子页 connect 先注册 message 监听，再发送 ready。
2. 父页根据 contentWindow 与预期 origin 识别子页，校验 ready 的 kind / role 后记录就绪；crossReady 只表示跨源实验子页已报告就绪。
3. 若初始 ready 早于父页监听，父页在初始化和 iframe load 时向同源、跨源子页发送精确 targetOrigin 的 hello，子页再次发送 ready。不透明子页不参与这个可信握手。
4. 请求只有收到匹配 id 的 ack 才完成确认；重载跨源页时重置就绪并清理旧等待，新的 load 本身不会置 crossReady 为 true。

ready 是本实验的应用协议，不是浏览器提供的持续在线保证。源码用 load 重置跨源状态，说明连接状态需要随文档变化重新建立。

跨源子文档只接受可信父窗口、精确 origin 和合法 probe；以下展示子页的处理分支，省略 hello、日志、监听清理和完整字段约束：

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

片段对应子页 probe 分支，完整子页还限制 id 长度；父页则校验来源、角色、消息结构，并用 pending 匹配 ack。合法请求由子页处理后回 ack，非法数字 id 在子页被拒绝，父页随后超时。1500ms 是本实验策略，该时间只用于演示超时策略；更完整的拒绝路径、transferable 与端口协议见 [通信笔记](../communication/cross-context-communication.md)。[postMessage 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)

子页使用外置 defer classic script，便于 allow-scripts 的不透明上下文直接加载；它不依赖 module 的 CORS 获取。这里没有放宽消息来源检查。其他窗口伪造 origin/source、transferable、端口和完整可靠性机制见 [通信笔记](../communication/cross-context-communication.md)。

## 4. 存储、性能与生命周期

不同端口是跨源但不必然跨站；本地双源实验不能验证真实第三方 Cookie 与跨站存储分区。相关策略见 [Cookie](../storage/cookie/cookie.md)、[Web Storage](../storage/webStorage/webStorage.md)与 [存储配额与隔离](../storage/storageManagement/storageManagement.md)。

每个 iframe 带来独立解析、脚本和渲染成本。非首屏内容可考虑 loading="lazy" 并预留尺寸，但浏览器懒加载策略不等于固定延迟，本 demo 为明确实验顺序采用正常加载。父页生命周期监听也不能替代子文档自己的资源清理。

当前实验父页离开会移除 message / load / click 监听并清理 pending 超时；子页离开会移除自身监听。BFCache 恢复时重新建立监听。实际恢复受浏览器策略影响，不能假定页面关闭必达某个事件；详见 [生命周期](../lifecycle/page-lifecycle.md)。
