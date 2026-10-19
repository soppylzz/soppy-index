# 跨上下文通信：先找到对方，再传递数据

用户在一个标签页退出登录，其他标签页怎样更新界面？父页面怎样把配置交给跨源 iframe？这两种需求都叫通信，但寻找接收方的方式不同：前者需要通知一组页面，后者需要找到指定窗口。

每个窗口或 worker 有自己的执行环境。传递普通对象通常得到数据副本，不意味着双方可以直接修改同一个对象。理解通信时，依次回答三个问题：消息发给谁、传递什么、怎样知道对方处理完成。

## 根据接收方选择 API

| 需求 | API | 如何找到接收方 |
| --- | --- | --- |
| 通知同一应用的多个标签页 | BroadcastChannel | 同名频道，并满足同源、存储分区和接收资格等条件 |
| 让其他页面响应已有存储变化 | storage event | 共享同一存储区的其他 Window |
| 与指定 iframe 或窗口通信，包括跨源窗口 | window.postMessage | 持有目标窗口引用 |
| 建立专用双向消息通道 | MessageChannel | 创建一对端口，将其中一端交给对方 |
| 多个页面共同使用一个执行环境 | SharedWorker | 匹配到共享 worker 实例，各自通过端口连接 |

同源由协议、主机和端口共同决定，但同源仍不保证所有上下文互通。浏览器的存储分区和隐私配置可能进一步隔离频道、存储区与共享 worker。例如，嵌在另一站点下的 iframe，不能仅因与某个顶层页面同源，就断言可以共享广播频道。[Storage Standard](https://storage.spec.whatwg.org/#storage-keys)、[HTML 广播算法](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts)

以下片段说明各 API 的必要操作，不依赖本仓库的 demo。需要分别放在标明的页面或 worker 脚本中；跨源示例中的域名应替换为实际部署地址。

## 多标签通知：BroadcastChannel

适合“登录状态变化”“某份数据需要重新读取”这类多方通知。需要通信的页面分别创建同名频道，再监听消息：

```js
const channel = new BroadcastChannel("account-events")

channel.addEventListener("message", (event) => {
  const data = event.data
  if (data?.type !== "session-changed") return
  console.log("Reload session state", data.revision)
})

function notifySessionChanged(revision) {
  channel.postMessage({ type: "session-changed", revision })
}

function disconnect() {
  channel.close()
}
```

先在各页面安装监听，再调用 notifySessionChanged；不再需要频道时执行 disconnect。接收方应重新获取权威状态，而不是仅凭广播内容认定某个用户已获授权。

发送的频道对象不会收到自己发出的消息，但同一页面中另一个同名频道对象可以收到。排除的是发送对象，不是整个标签页。频道没有历史重放、在线成员列表或自动业务确认；后来打开的页面需要自行初始化状态。消息按结构化克隆传递，BroadcastChannel 不接受 transfer list。[HTML 广播算法](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts)

## 存储变化通知：storage event

如果应用本来就把主题等偏好写入 localStorage，可以让其他页面监听变化，不必再额外广播一次：

```js
const controller = new AbortController()

window.addEventListener(
  "storage",
  (event) => {
    if (event.storageArea !== localStorage || event.key !== "theme") return
    console.log("Theme changed in another document", event.oldValue, event.newValue)
  },
  { signal: controller.signal }
)

function saveTheme(theme) {
  try {
    localStorage.setItem("theme", theme)
    console.log("Apply theme in this document", theme)
  } catch (error) {
    console.error("Cannot persist theme", error)
  }
}

function disconnect() {
  controller.abort()
}
```

修改存储的 Window 不会收到自己的 storage 事件，因此本页更新应由写入逻辑主动执行。写入完全相同的值不产生变化事件；删除 key 时 newValue 为 null，clear 时 key 为 null。这里筛选了 theme，所以会忽略 clear；业务若支持清空后恢复默认值，需要另行处理。

localStorage 通知共享该存储区的其他同源窗口；sessionStorage 的通知限于同一顶层浏览上下文内共享存储区的文档，例如同源 iframe，不会用于独立标签页之间广播。[HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface)

存储写入是同步操作，值只能是字符串，还可能因配额或访问策略失败。把消息不断写进同一个 key，会覆盖旧值，也没有跨窗口读改写事务保证，不能把它当消息队列。存储本身的语义见 Web Storage。

## 指定窗口通信：window.postMessage

父页可以通过 iframe.contentWindow 找到目标，即使两页跨源，也能发送消息；这不需要配置 CORS，也不赋予读取对方 DOM 的权限。

下面约定父页为 `https://app.example`，iframe 为 `https://widget.example`。先在父页安装接收器并准备 iframe，子页准备好后主动发 ready，避免把 iframe 的 load 事件当作应用已就绪的证明。

父页脚本：

```js
const childOrigin = "https://widget.example"
const frame = document.createElement("iframe")
frame.src = `${childOrigin}/widget`

window.addEventListener("message", (event) => {
  if (event.origin !== childOrigin || event.source !== frame.contentWindow) return
  if (event.data?.v !== 1 || event.data.type !== "ready") return
  if (event.ports.length !== 0) return

  frame.contentWindow.postMessage({ v: 1, type: "configure", theme: "dark" }, childOrigin)
})

document.body.append(frame)
```

子页脚本：

```js
const parentOrigin = "https://app.example"

window.addEventListener("message", (event) => {
  if (event.origin !== parentOrigin || event.source !== parent) return
  const data = event.data
  if (data?.v !== 1 || data.type !== "configure") return
  if (data.theme !== "light" && data.theme !== "dark") return
  if (event.ports.length !== 0) return
  document.documentElement.dataset.theme = data.theme
})

parent.postMessage({ v: 1, type: "ready" }, parentOrigin)
```

发送端用精确 targetOrigin 限制目标，接收端校验 origin、source 和消息结构：origin 回答来自哪个源，source 回答是不是本次配对的窗口，结构校验限制允许执行的操作。只检查其中一项都不充分。上述监听在组件卸载时也应移除，避免重复处理。

目标窗口可能导航；event.origin 表示发送消息时的来源，不保证该窗口之后仍在同一源。错误 targetOrigin 可能导致消息被丢弃，发送调用没有抛错不代表子页已经处理。不要把消息字符串直接写进 innerHTML；允许源内的恶意脚本也不能靠 origin 校验消除。[HTML 跨文档消息](https://html.spec.whatwg.org/multipage/web-messaging.html#crossDocumentMessages)

## 专用双向通道：MessageChannel

window.postMessage 使用窗口级 message 监听。需要把一段通信交给专门对象时，可以创建 MessageChannel：保留 port1，把 port2 转移给对方，之后两端只通过端口通信。

沿用上一节的父子页和来源约定。父页收到并验证 ready 后，执行以下连接片段，替代原来的 configure 发送：

```js
const channel = new MessageChannel()
const port = channel.port1

port.addEventListener("message", (event) => {
  if (event.data?.type === "connected") {
    port.postMessage({ type: "ping", id: "request-1" })
  } else if (event.data?.type === "ack" && event.data.id === "request-1") {
    console.log("Peer handled ping")
    port.close()
  }
})
port.start()

frame.contentWindow.postMessage({ v: 1, type: "connect" }, childOrigin, [channel.port2])
```

子页增加连接分支，仍先验证窗口来源，再接受端口：

```js
window.addEventListener("message", (event) => {
  if (event.origin !== parentOrigin || event.source !== parent) return
  if (event.data?.v !== 1 || event.data.type !== "connect") return
  if (event.ports.length !== 1) return
  const port = event.ports[0]

  port.addEventListener("message", (event) => {
    const data = event.data
    if (data?.type !== "ping" || typeof data.id !== "string") return
    port.postMessage({ type: "ack", id: data.id })
    port.close()
  })
  port.start()
  port.postMessage({ type: "connected" })
})
```

addEventListener 注册端口监听后要调用 start；设置 onmessage 会隐式启动接收。此例完成一次 ping 后关闭端口；长连接应在不再使用、连接失败或重建前清理旧端口。交付被拒绝时，接收方也应关闭不需要的 event.ports。

端口本身就是通信能力。后续端口消息不能再依靠窗口消息的 origin / source 认证对方，所以安全边界在最初交付时建立，消息结构和操作权限仍须持续检查。[HTML Channel messaging](https://html.spec.whatwg.org/multipage/web-messaging.html#channel-messaging)

## 多页面共享执行环境：SharedWorker

BroadcastChannel 只传通知。如果多个页面需要共同维护一份内存状态或复用连接，可以通过 SharedWorker 把工作集中到共享执行环境；它不会自动向所有页面广播。

页面脚本：

```js
if ("SharedWorker" in window) {
  const worker = new SharedWorker("/shared-counter.js", {
    name: "shared-counter",
    type: "module",
  })
  worker.addEventListener("error", () => console.error("Shared worker failed"))
  worker.port.addEventListener("message", (event) => {
    console.log("Shared state", event.data)
  })
  worker.port.start()
  worker.port.postMessage({ type: "increment" })
  // Call worker.port.close() when this connection is no longer needed.
}
```

对应的 `/shared-counter.js`，需要作为同源脚本提供，而不是直接写在页面脚本中：

```js
const instance = crypto.randomUUID()
let count = 0

globalThis.addEventListener("connect", (event) => {
  const port = event.ports[0]
  port.addEventListener("message", (event) => {
    if (event.data?.type !== "increment") return
    count += 1
    port.postMessage({ instance, count })
  })
  port.start()
})
```

每个页面有自己的连接端口，count 则位于 worker 中。若两个页面连接同一实例，会得到相同 instance 与累加的 count；HTTP 请求过同一脚本不足以证明共享了执行环境。实例匹配涉及存储键、脚本 URL、name 及构造选项，不能仅凭文件名相同判断；还应处理浏览器支持与脚本加载失败。[HTML SharedWorker](https://html.spec.whatwg.org/multipage/workers.html#shared-workers-and-the-sharedworker-interface)

worker 没有 DOM，内存状态也不会天然持久化。关闭一个页面的端口、关闭所有页面和终止 worker 是不同的事；不要把它当作永久后台服务。[HTML worker 生命周期](https://html.spec.whatwg.org/multipage/workers.html#the-worker's-lifetime)

## 数据如何过去：克隆、编码与转移

BroadcastChannel、窗口消息和端口消息使用结构化克隆；storage 需要应用自行编码字符串。克隆支持 Date、Map 和循环引用等数据，但不是任意对象复制，也不保留所有类行为，完整例子见[结构化克隆与转移](./structured-clone.md)。

窗口、端口和 worker 消息还支持转移资源。例如，通过一个已建立的 MessagePort 发送 buffer：

```js
const buffer = new ArrayBuffer(8)
new Uint8Array(buffer)[0] = 42
port.postMessage({ type: "bytes", buffer }, [buffer])
console.log(buffer.byteLength) // 0: ownership was transferred.
```

接收端从 event.data.buffer 读取内容。typed array 本身不是可转移对象，可以转移其底层 ArrayBuffer。transfer list 控制资源交付，不会自动把 buffer 添加到消息正文中；发送方也不能继续使用已分离的 buffer。发送端序列化失败可能同步抛出 DataCloneError，接收端反序列化失败则可能触发 messageerror。[HTML 结构化数据](https://html.spec.whatwg.org/multipage/structured-data.html)

## 消息发出，不等于业务完成

| 观察到的阶段 | 可以说明什么 | 仍不能说明什么 |
| --- | --- | --- |
| postMessage 调用返回 | 本地调用没有同步失败 | 对方已接收或执行 |
| message 回调被调用 | 接收方开始处理事件 | 消息合法、业务成功或数据已持久化 |
| 收到匹配 request id 的 ack | 对方按协议报告处理结果 | 自动获得持久化、全局顺序或 exactly-once 保证 |
| 等待超时 | 期限内未收到匹配确认 | 对方没执行、失败发生在哪一层 |

需要确认时，在消息中加入协议版本、请求 id 和操作类型；接收端校验后执行业务，再返回同一 id 的 ack。上一节端口示例的 ack 仅确认 ping 处理完成，不能代表数据库提交。实际请求还应设置超时，清理等待记录，并处理同步发送失败、重复或迟到确认。

超时只结束本地等待，不能撤销对方已经执行的工作。重试涉及副作用时，需要业务幂等键和接收端去重，不能换一个新 id 重发就宣称“只执行一次”。广播收到一个 ack，也不能证明所有页面都处理完毕。

## 页面离开后，连接怎样处理

不再使用时关闭 BroadcastChannel 和 MessagePort，移除窗口、storage 监听与定时器。页面冻结时可能暂时无法处理消息，因此短暂沉默不是对方已经关闭的证据；不能依赖 unload 或最后一条消息完成关键保存。

若在 pagehide 释放连接，从 BFCache 恢复后应在 pageshow.persisted 分支重新建立连接并重新同步状态。具体策略见[页面生命周期](../lifecycle/page-lifecycle.md)与 [BFCache](../lifecycle/bfcache.md)。这些通信机制都不能代替业务状态持久化。
