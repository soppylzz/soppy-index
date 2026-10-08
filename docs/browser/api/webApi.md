# 常用 Web API：数据、取消与环境能力

[模块导航](./README.md) · [实验走查](./index.md) · [完整浏览器脚本](./assets/lab.js)

## 1. 语言与宿主边界

JavaScript 语言提供语法和内建对象；DOM、fetch、计时器、URL 等由 Web 平台规范定义。Node 也实现了部分 Web API，不代表窗口、权限或生命周期条件相同。学习 API 应同时回答：运行在哪个全局环境，是否要求安全上下文、权限或用户激活，如何失败，以及谁负责资源释放。

本模块选取可在本地直接验证的工具与文件 API。DOM 操作见 [DOM](../dom/README.md)，观察器见 [Observer](../observer/README.md)，消息机制见 [通信](../communication/README.md)，页面离开和后台行为见 [生命周期](../core/lifeCycle/README.md)。

## 2. URL 与结构化克隆

使用 URL 解析相对路径，通过 searchParams 设置参数，避免把 `&`、空格与中文直接拼接成查询字符串。重复键用 append / getAll；set 会替换该键已有值。URL 解析成功不等于该协议或地址允许业务访问，接收不可信跳转地址时还需检查协议和来源。

`/tools` 的片段如下；省略日志与按钮绑定，完整实现见 [lab.js](./assets/lab.js)。

```js
const url = new URL("/api/delay", window.location.href)
url.searchParams.set("q", "空格 & 中文")
url.searchParams.append("tag", "a")
url.searchParams.append("tag", "b")
```

structuredClone 支持循环引用、Map、Date 等可克隆类型；不是复制任意 JavaScript 对象语义的工具。函数、DOM 节点等不能克隆，自定义原型、属性描述符等也不能假定原样保存。transfer 转移所有权，不是额外复制，原 ArrayBuffer 会 detached。[structuredClone 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/structuredClone)

```js
const buffer = new ArrayBuffer(8)
new Uint8Array(buffer)[0] = 42
const result = structuredClone({ buffer }, { transfer: [buffer] })
log(`source=${buffer.byteLength} target=${result.buffer.byteLength}`)
```

本实验同时验证循环引用、Date、Map，以及函数克隆抛 DataCloneError。跨窗口传递可克隆值、transferable 的可达性与端口所有权详见 [通信笔记](../communication/crossContextCommunication.md)，不在此重复。

## 3. fetch：响应、读取、业务结果与取消

fetch fulfilled 表示获得 Response，不自动表示 HTTP 成功；404 / 500 通常仍 fulfilled。网络失败或取消可以 reject，response.json 本身也可能因为内容格式、流状态或取消而失败。响应头到达、响应体读取完成、业务提交成功分别需要证据。[fetch 官方文档](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)

`/tools` 请求由服务真正等待 1200ms 后响应，不用页面定时器伪造网络延迟。以下保留核心控制流，省略 request id、旧请求竞争保护、按钮绑定及 pagehide 清理；2.5 秒超时是实验应用策略：

```js
const controller = new AbortController()
const timer = setTimeout(() => controller.abort(), 2500)
try {
  const response = await fetch("/api/delay?ms=1200", {
    signal: controller.signal,
  })
  log(`响应到达 status=${response.status}`)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const data = await response.json()
  log(`响应体已读取 ${JSON.stringify(data)}`)
} catch (error) {
  log(`请求结束 ${error.name}`)
} finally {
  clearTimeout(timer)
}
```

AbortController 是一次性的取消信号，abort 后不会复位；重试要创建新的 controller。取消必须向下游传递 signal，并清理计时器和监听器；不能强制停止任意不检查 signal 的计算，也不能回滚已经到达服务端的事务。实际完整实现还区分每次请求身份，防止旧响应覆盖新操作。

本实验服务在响应连接关闭时清理延迟定时器；这只演示本地资源回收，不等于证明所有请求取消都能避免服务端副作用。

### FormData 与内容类型

FormData 表示字段与文件序列，可包含同名多值。由 fetch 为 multipart/form-data 生成 boundary，通常不要手写 Content-Type，否则标头与请求体分隔符可能不匹配。[FormData 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest_API/Using_FormData_Objects)

```js
const data = new FormData()
data.append("title", "浏览器表单")
data.append("file", new Blob(["demo"], { type: "text/plain" }), "demo.txt")
const response = await fetch("/api/inspect", { method: "POST", body: data })
```

实验接口只读取字节并回显 contentType / bytes，最多 65536 字节，超出返回 413。不解析 multipart 字段，不持久化，也不宣称文件已通过业务校验。它用来证明浏览器生成了 boundary 并发送请求体。

## 4. Blob、File 与 Object URL

Blob 是不可变字节数据，File 在其上提供名称、lastModified 等信息。Blob.text / arrayBuffer / stream 提供不同读取方式；FileReader 是事件式读取，需处理 load、error、abort。选择文件只是授权应用访问所选文件，不能任意读取磁盘路径。

`/files` 使用 Blob.text 和 FileReader 两种实际读取路径。如下是 Object URL 的核心，省略用户选择、下载链接、异常和页面退出清理：

```js
const blob = new Blob(["浏览器本地内容"], { type: "text/plain;charset=utf-8" })
const objectUrl = URL.createObjectURL(blob)
const text = await (await fetch(objectUrl)).text()
log(text)
URL.revokeObjectURL(objectUrl)
```

Object URL 是浏览器为 Blob 建立的引用，不是把文件上传到服务器，也不是持久地址。用完应 revoke；不要在图片、下载等消费者仍需该 URL 时过早释放。revoke 阻止后续通过该 URL 访问，不使已获得的 Blob 字节失效。完整实验保留下载入口直到显式释放或断开，更新 URL 前先释放旧 URL。[createObjectURL 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL_static)、[revokeObjectURL 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL_static)

文件选择实验限制 64 KiB，只做文本读取，日志最多显示前 120 个字符。扩展到大文件时应考虑分片、流、编码与内存，而非无界读取并打印。

## 5. 环境信号与权限

`matchMedia("(max-width: 700px)")` 返回当前匹配状态，通过 change 事件响应条件跨越；只在 JS 行为需要媒体条件时使用，纯样式优先 CSS。页面断开会移除 change / online / offline 监听。

navigator.onLine 是浏览器估计的连接信号，局域网连接或代理并不证明某目标服务可达。真正的可用性要通过请求结果、超时和业务状态判断，不能仅因 false 就永久禁用操作。[onLine 官方说明](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine)

| 能力                      | 常见前提与失败处理                                              | 本 demo            |
| ------------------------- | --------------------------------------------------------------- | ------------------ |
| Clipboard                 | 安全上下文，激活 / 权限规则因方法与浏览器而异；捕获拒绝         | 不主动请求         |
| Fullscreen、Web Share     | 通常需要短暂用户激活，还受嵌入策略和支持情况影响                | 不主动请求         |
| Geolocation、Notification | 检测能力，由明确用户操作发起，处理权限拒绝、变化及 API 自身错误 | 不主动请求         |
| 文件选择                  | 用户选取文件；取消选择是正常路径                                | 提供原生 input     |
| matchMedia / onLine       | 状态信号，不是权限或业务结果                                    | 提供真实事件与快照 |

安全上下文不等同于“字符串以 https 开头”；本地可信地址可能满足条件，应读取 isSecureContext。具体 API 的支持和权限政策必须分别查阅官方资料，不能用一张表当作所有版本的承诺。[安全上下文说明](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts)

本地实测版本与未验证环境见 [走查](./index.md)。特性存在只证明接口可用，仍需捕获运行失败。
