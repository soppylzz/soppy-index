# 跨上下文通信机制

[返回模块](./README.md) · [实验走查](./index.md)

通信先回答三个问题：能找到哪些上下文、数据如何越过边界、什么证据能说明对方完成工作。标签页本身不是消息地址；不同 API 用频道、存储区、worker 身份、窗口引用或端口来找到接收方。

以下代码按对应机制摘出核心流程，省略按钮、页面渲染及完整异常处理，并非可单独复制运行的完整程序。`envelope`、`valid`、`ack` 来自 [common.js](./assets/common.js)，`request`、`receive`、`log` 与连接状态的完整用法见 [main.js](./assets/main.js)；`valid` 检查版本、id、类型和操作白名单。

## 1. 范围与选择

| 机制               | 接收范围 / 寻址                                                               | 发送者是否收到                                 | 数据与适用场景                                     |
| ------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| BroadcastChannel   | 相同 storage key、同名且可接收的频道对象；页面与 worker                       | 发送的对象不收到；同一页另一个同名对象可以收到 | 结构化克隆；多方状态失效通知，无成员列表和持久队列 |
| storage event      | 共享同一存储区的其他 Window                                                   | 修改存储的 Window 不收到                       | 字符串；兼容性通知，更新伴随同步存储写入           |
| SharedWorker       | 可匹配到同一实例的同源上下文，各自通过 port 连接                              | worker 可主动回给发起者；是否广播由应用决定    | 结构化克隆与转移；共享连接、计算或协调状态         |
| window.postMessage | 持有 WindowProxy 引用的窗口，包括 parent、iframe.contentWindow、可用的 opener | 投递到指定窗口；发给自身也可以收到             | 结构化克隆与转移；跨源握手、窗口通信               |
| MessageChannel     | 一对纠缠的 MessagePort                                                        | 从一端发送，另一端接收；没有自动回声           | 结构化克隆与转移；私有双向通道、能力交付           |

BroadcastChannel 的接收者筛选和排除发送对象由 [HTML 广播算法](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts)定义。跨 API 没有统一的全局消息顺序，不能把一次日志先后当作所有上下文的排序保证。

### 同源仍不足以保证互通

origin 是协议、主机、端口三元组。示例里的 `127.0.0.1:5008` 与 `127.0.0.1:5009` 跨源，但仍是同站点；端口不同不能模拟第三方跨站分区。

[Storage Standard](https://storage.spec.whatwg.org/#storage-keys)提供 storage key 基础模型；浏览器可能进一步按顶层站点、隐私配置划分数据。BroadcastChannel 通常需要同源且处于同一存储分区：顶层 `a.example` 嵌入的 `b.example` iframe，不能据同源就断言能与顶层 `b.example` 页通信，见 [MDN 的分区说明](https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API)。localStorage、共享 worker 也要考虑第三方存储及分区策略、浏览器配置和独立隐私会话。不要把频道名称或同源当作身份认证。

postMessage 与 MessagePort 不按广播频道的存储分区寻址，仍需要可用的窗口引用或已交付的端口。跨源 iframe 的存在不赋予父页读取其 DOM 的权限。

## 2. 每种机制的关键行为

### BroadcastChannel：通知可见接收方

创建同名对象后监听 `message`；关闭用 `close()`。不存在订阅方时发送不会等待，也不会为后来加入者保存历史。Window 接收资格涉及文档 fully active，worker 也有活动条件；暂停、冻结和导航会改变可接收状态。没有自动 ack、在线成员探测或自动重发。

Demo 每页默认一个频道，所以发送页只收到另一页的 ack；勾选「第二频道对象」后，本页可直接观察自己发出的 request。这证明排除单位是对象。广播多个接收者时，本实验接受第一个匹配 ack，后续标为重复；它不证明所有成员已处理。

核心代码对应 [main.js](./assets/main.js)：每页创建一个频道，接收 request 后回 ack，接收 ack 时由 `receive` 匹配 pending。勾选第二对象后，只增加观察者。

```js
const channel = new BroadcastChannel("communication-lab-v1")
channel.onmessage = (event) => {
  receive(event.data, "bc", (data) => channel.postMessage(data))
}
request("bc", (data) => channel.postMessage(data))

const mirror = new BroadcastChannel("communication-lab-v1")
mirror.onmessage = (event) => log(`第二对象收到 ${event.data.type}`)

// On disconnect.
channel.close()
mirror.close()
```

最后两行是断开时执行的清理步骤；应先完成收发观察，再关闭频道。

### storage event：存储变化的副作用

localStorage 事件到达共享存储区的其他同源 Window；sessionStorage 只在同一顶层浏览上下文内共享该会话存储区的其他同源文档间通知，例如同源 iframe，不会传播到独立标签页。事件包括 `key`、`oldValue`、`newValue`、`url`、`storageArea`。删除的 `newValue=null`，clear 的 `key=null`；写入完全相同的值不会产生变化事件。这些是 [HTML Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface) 和 [storage 事件文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event)的行为。

Demo 用 JSON 字符串传请求和 ack，每次新 request id 改变值；接收者只处理实验 key 并区分 request / ack，避免回应循环。单 key 会被覆盖，不是持久消息队列，也不提供跨窗口读改写事务锁。真正业务状态应重新读取或有版本校验。同步阻塞、配额、页面会话复制等详见 [Web Storage](../storage/webStorage/README.md)。

对应 [main.js](./assets/main.js) 的事件筛选与回应流程：

```js
const storageKey = "communication-lab-v1"
window.addEventListener("storage", (event) => {
  if (event.storageArea !== localStorage || event.key !== storageKey) return
  if (event.newValue === null) return
  try {
    receive(JSON.parse(event.newValue), "storage", (data) => {
      localStorage.setItem(storageKey, JSON.stringify(data))
    })
  } catch (error) {
    log(`storage 解析 / 回应失败 ${error.name}`)
  }
})
request("storage", (data) => {
  localStorage.setItem(storageKey, JSON.stringify(data))
})
```

`request` 生成新 id，`receive` 只对 request 回 ack，避免收到 ack 后再次回应。完整 demo 用 AbortController 在断开时移除此监听。

### SharedWorker：共享执行环境，不是自动广播

创建时指定同源脚本 URL 和 name；匹配还涉及 storage key、脚本 URL / 名称及构造选项，不能只凭脚本文件同名推断共享。相同命名实例的 type、credentials 等选项不兼容可能连接失败，参见 [SharedWorker 构造规则](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker/SharedWorker)。每次连接触发 worker 的 `connect` 事件，连接端口在 `event.ports[0]`；worker 没有 DOM，连接页面通过 `worker.port` 交换消息。

Demo 在 worker 内保存 instance 和 count，只对提出请求的端口回 ack；相同 instance 且 count 递增才是共享实例的证据。页面各有自己的 UI 状态，HTTP 对 worker 文件请求次数不是实例共享的充分证据。端口用 `addEventListener('message', ...)` 时必须 `start()`；设置 `onmessage` 会隐式启用，本实验仍显式调用，见 [MDN SharedWorker](https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker)。

页面连接代码对应 [main.js](./assets/main.js)：

```js
const worker = new SharedWorker("/assets/worker.js", {
  name: "communication-lab-v1",
  type: "module",
})
worker.port.onmessage = (event) => receive(event.data, "worker")
worker.port.start()
request("worker", (data) => worker.port.postMessage(data))
```

[worker.js](./assets/worker.js) 中的核心计数逻辑如下；每个连接有独立 port，`count` 和 `instance` 则位于共享执行环境。这里省略了完整实现中的 heartbeat、bye 和租约回收。

```js
import { ack, valid } from "./common.js"

const instance = crypto.randomUUID().slice(0, 8)
let count = 0
globalThis.onconnect = (event) => {
  const port = event.ports[0]
  port.onmessage = (event) => {
    const data = event.data
    if (!valid(data) || data.type !== "request" || data.scope !== "worker") return
    if (data.op === "ping") count++
    port.postMessage(ack(data, `instance=${instance} count=${count}`))
  }
  port.start()
}
```

### window.postMessage：限制目的地并验证实际发送者

跨源发送需要窗口引用，不需要放开 CORS。Demo 用 iframe 而不是依赖弹窗 opener；`noopener`、COOP 或导航可能切断 opener，不能把新开窗口都视为可回传引用。

发送指定精确 targetOrigin，接收端再检查：

1. `event.origin` 是否为允许的 origin；它是发送时来源，不能据此信任窗口后续导航到的新文档。
2. `event.source` 是否是本次配对的父窗口或可信 iframe.contentWindow；允许 origin 下的另一窗口也不自动可信。
3. `event.data` 是否符合版本、类型、request id、sender、scope 和操作白名单；建立通道时还检查转移端口数量。

targetOrigin 在目标派发时匹配，目标已导航到其他源则消息可被静默丢弃；调用未抛异常仍不等于被接收。消息解析后也须限制权限和工作量，不把字符串当 HTML 执行。规则见 [Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)。

本实验的错误 origin / source 窗口真实接收请求后回 ack，主页因实际 MessageEvent 元数据拒绝。错误结构由可信父窗口发给可信 iframe，iframe 拒绝；错误 targetOrigin 则由浏览器阻止投递，iframe 不产生接收日志。四种拒绝发生在不同层，发送页超时本身无法区分原因。

[main.js](./assets/main.js) 向可信 iframe 发请求时，从配置取精确源；[frame.js](./assets/frame.js) 在接收端检查三层约束。下面是普通 window 请求的精简分支，带端口的 connect 分支见下一节。

```js
const trusted = document.querySelector("#trusted")
const peerOrigin = document.body.dataset.peer
request("window", (data) => {
  trusted.contentWindow.postMessage(data, peerOrigin)
})
```

```js
const parentOrigin = document.body.dataset.parent
window.addEventListener("message", (event) => {
  if (event.origin !== parentOrigin) {
    log("拒绝 origin")
    return
  }
  if (event.source !== parent) {
    log("拒绝 source")
    return
  }
  const data = event.data
  if (
    !valid(data) ||
    data.type !== "request" ||
    data.scope !== "window" ||
    data.op === "connect" ||
    event.ports.length !== 0
  ) {
    event.ports.forEach((port) => port.close())
    log("拒绝 schema")
    return
  }
  log(`接收并处理 id=${data.id}`)
  parent.postMessage(ack(data, "请求已处理"), parentOrigin)
})
```

拒绝实验也通过真实窗口发送：改为 `{ ...data, op: 42 }` 会触发 schema 拒绝；换同源的另一 iframe 会触发 source 拒绝；改 targetOrigin 则在浏览器投递层被拦截。完整实现也会关闭 origin/source 拒绝消息附带的端口。

### MessageChannel：先安全交付，再以端口授权

`new MessageChannel()` 创建 port1 / port2。保留 port1，借已验证的 window 消息转移 port2。接收端从 `event.ports` 取端口，后续不再依赖全局 window 监听。

端口消息没有可用于重复窗口认证的 origin / source 信息；MessagePort 的持有权就是通信能力。因此必须在交付时验证来源，并继续验证端口消息结构、业务权限和资源使用。[HTML Channel messaging](https://html.spec.whatwg.org/multipage/web-messaging.html#channel-messaging)说明了端口与能力模型；不要给不可信方完整管理端口。

端口交付对应 [main.js](./assets/main.js) 的 channel 操作：

```js
const pair = new MessageChannel()
const port = pair.port1
port.onmessage = (event) => receive(event.data, "port")
port.start()
request(
  "window",
  (data) => {
    trusted.contentWindow.postMessage(data, peerOrigin, [pair.port2])
  },
  "connect"
)
```

这里省略了 `port-ready` 握手分支；真实 demo 会等握手后才启用发送。可信 iframe 在验证 origin、source、connect 消息结构与 `event.ports.length === 1` 后执行：

```js
const port = event.ports[0]
port.onmessage = handlePort
port.start()
port.postMessage({ v: 1, type: "port-ready", sender: identity })
```

`handlePort` 在 [frame.js](./assets/frame.js) 中继续验证端口消息；端口重建前先清理旧连接。

## 3. 克隆与转移

| 路径                               | 机制                           | 可观察结果                            |
| ---------------------------------- | ------------------------------ | ------------------------------------- |
| BroadcastChannel                   | 结构化克隆，无 transfer list   | 函数无法克隆，发送时抛 DataCloneError |
| storage                            | 应用自己编码字符串             | JSON 不保留 Date、Map、循环引用等语义 |
| Window / MessagePort / worker.port | 结构化克隆，可传 transfer list | 普通对象复制；转移资源从原持有方分离  |

可克隆类型、循环引用与原型等通用语义见 [常用 Web API](../api/webApi.md#2-url-与结构化克隆)。通信还要区分失败发生在哪一端：发送端序列化失败可能同步抛错，接收端反序列化失败可触发 messageerror；demo 的函数实验只验证前者。即使值可被 structuredClone 复制，也仍需符合具体通信接口的参数及接收条件。

ArrayBuffer 转移后发送端 `byteLength=0`，接收端仍读到 8 字节和首字节 42。typed array 本身不是 transferable，可转移其底层 buffer。transfer list 指定资源的交付方式，不会自动把资源放入消息；本实验把 buffer 放在 `data.buffer`，port2 通过 `event.ports` 取出。MessagePort 转移后旧持有方不能再使用它；BroadcastChannel 对象不是可转移端口。参见 [Transferable objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)。本模块不演示 SharedArrayBuffer / 跨源隔离。

buffer 实验对应 [main.js](./assets/main.js) 的 `sendPort`，仍通过同一个带 id 的 request 包装器发送：

```js
const buffer = new ArrayBuffer(8)
new Uint8Array(buffer)[0] = 42
request(
  "port",
  (data) => {
    port.postMessage(data, [buffer])
    log(`转移后发送端 buffer.byteLength=${buffer.byteLength}`)
  },
  "ping",
  { buffer }
)
```

接收端先检查 `data.buffer instanceof ArrayBuffer`，再读取 `byteLength`、首字节并回 ack；这两端观察共同说明转移结果。

## 4. 接收、业务确认与可靠性

| 阶段                        | 可以说明什么             | 不能说明什么                             |
| --------------------------- | ------------------------ | ---------------------------------------- |
| 发送调用返回                | 本地调用没有同步抛异常   | 对方在线、已接收或已执行                 |
| 接收 message / storage 回调 | 接收端 JS 处理了该事件   | schema 合法、业务完成、数据已持久化      |
| 匹配 request id 的 ack      | 接收方按约定报告处理结果 | 整个分布式系统的 exactly-once 或持久提交 |
| 超时                        | 期限内未见匹配 ack       | 失败发生在哪层、业务一定未执行           |

本实验 v=1 标记协议版本，用 UUID request id 关联 ack，用 scope 区分传输路径。顺着 [main.js](./assets/main.js) 的 `request()` 与 `receive()` 阅读，可以把一次请求串成以下过程：

```text
request -> 创建 envelope -> 登记 pending -> send
                                            |
接收端 -> 校验来源及 schema -> 处理请求 -> 返回 ack
                                            |
发送端 receive -> 校验 schema / scope -> 匹配 pending -> 清理并显示结果
```

来源检查由具体窗口或端口入口负责；receive 的通用校验不能代替 origin / source 检查。pending 最多 30 条，发送前登记 id、scope 与 1800ms 定时器，便于匹配后续确认。发送调用返回只记录本地调用结果；同步抛错则在 request 的 catch 中立即清理该等待。

接收端校验通过后才进入操作分支。主页面 receive 对可回应的 request 回 ack；iframe 的 fail 返回 error ack，端口 silent 只记录接收，不执行业务处理也不 ack。发送端收到合法 ack 后还要匹配 pending 的 id 与 scope；匹配成功才取消定时器、删除记录并显示 ok / error。迟到或重复 ack 会被忽略，不能将“收到一条 ack 日志”直接当作当前请求成功。

1800ms 和容量上限是应用策略；后台节流会改变实际等待时长。业务要重试时应复用业务幂等键，并由接收方去重；不能简单换 id 重发就声称只执行一次。本实验不自动重试、不提供持久化和身份签名。origin / source 验证也不防止允许源里的恶意脚本。

对应上述发送与确认阶段的 pending 核心步骤如下，省略容量检查、发送失败及断开取消分支：

```js
const timer = setTimeout(() => {
  pending.delete(data.id)
  log(`超时 id=${data.id}：未收到业务确认`)
}, 1800)
pending.set(data.id, { scope: data.scope, timer })
send(data)

// In the validated ack branch.
const item = pending.get(reply.id)
if (item && item.scope === reply.scope) {
  clearTimeout(item.timer)
  pending.delete(reply.id)
  log(`业务确认 status=${reply.status} result=${reply.result}`)
}
```

这是发送端 request 与发送端接收 ack 时的两个片段，并不是接收方的完整处理器；data、send 和 reply 分别来自 request 包装器及已验证的 ack。正常确认、同步发送失败、超时、主动取消都需要移除对应 pending，确认 / 失败 / 主动取消还清除其定时器；重连、端口重建和 pagehide 通过 cancel 清理相应等待。超时只结束本地等待，不能撤销已执行的远端业务。

## 5. 关闭、冻结与恢复

频道 `close()` 后退出接收。端口 `close()` 解除连接，但没有通用可靠的对端离线通知；本实验发送应用 close / bye 通知再关闭，通知仍可能来不及处理。页面关闭不等于给所有对等方可靠广播离线。不要依赖 unload 或最后一条消息完成关键保存。

Demo 在 pagehide 清理频道、端口、监听器和定时器；从 BFCache 恢复时 pageshow.persisted 重新连接。页面未关闭但被冻结也可能暂时不处理消息，不能把超时当死亡证明。生命周期与保存策略见 [页面生命周期](../core/lifeCycle/pageLifecycle.md) 和 [BFCache](../core/lifeCycle/bfcache.md)。

SharedWorker 生命周期受 owner 文档、活动状态和浏览器终止策略影响，不能当永久后台进程。关闭一个客户端不会必然终止仍被其他页面使用的实例；最后页面关闭后的保留时间、扩展生命周期能力及支持程度不能写成固定跨浏览器承诺，见 [HTML worker lifetime](https://html.spec.whatwg.org/multipage/workers.html#the-worker's-lifetime)。调试工具保持引用也可能影响观察。

Demo 的 worker 通过每 3 秒 heartbeat、15 秒未见消息的租约清理遗留端口，租约数不是浏览器真实标签数量。后台节流可能清理仍存在的页面，此时用「连接 / 重连」恢复；计数仅存内存。端口关闭、页面关闭和 worker 实例终止是三件事，不能从一个 UI 状态推断另外两件。
