# WebSocket：从 HTTP 握手切换到双向消息

HTTP 可以持续返回响应，但如果双方都需要频繁主动发送消息，就需要约定双向消息的格式与生命周期。WebSocket 为浏览器和服务器提供长期双向消息通道；经典形式运行在 TCP 上，`wss` 再使用 TLS。

## 为什么名字里有 socket

socket 原本指通信端点抽象，应用可以通过端点读写数据。WebSocket 把类似持续双向通信的能力带给 Web，但它是具体的应用层协议和受限浏览器 API，不是把系统 socket API 原封不动开放给网页。

它与 TCP socket、Unix domain socket 的关系是不同层次的关系：TCP socket 是访问 TCP 的系统端点；Unix domain socket 是本机 IPC 端点；WebSocket 在底层连接上规定 Web 应用的握手和消息帧。它不依赖 Unix domain socket，也不能让网页任意连接 SSH 等服务。系统接口的具体流程见 [socket](../transport-security/socket.md)。

## HTTP/1.1 怎样升级

```http
GET /chat HTTP/1.1
Host: chat.example
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://app.example
```

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

这一组 Key/Accept 来自 RFC 的示例。Accept 通过 Key 与固定 GUID 计算，帮助确认服务器理解升级协议，不是用户认证，也不是加密密钥。

握手通过后，同一连接承载 WebSocket 帧，后续消息不再每条带一套 HTTP 请求头。HTTP/2、HTTP/3 使用扩展 CONNECT 等方式建立 WebSocket，不应把 `101 + Upgrade` 当成所有承载版本的共同要求。

## 有消息边界，仍需业务协议

WebSocket 支持文本和二进制消息。一条消息可以被拆成多个帧，控制帧还可以穿插；浏览器 `message` 事件按消息交付，不按 TCP 分段交付。客户端发出的帧需要 masking，masking 不提供保密性，保密仍依赖 TLS。

```js
const channel = new WebSocket("wss://chat.example/chat")

channel.addEventListener("open", () => {
  channel.send(JSON.stringify({ type: "subscribe", room: "general" }))
})
channel.addEventListener("message", (event) => {
  console.log("Message received", event.data)
})
channel.addEventListener("close", (event) => {
  console.log("Connection closed", event.code, event.wasClean)
})
```

这里只演示事件顺序。应用需要定义消息类型、大小、验证与授权。连接建立成功不代表当前用户有权订阅所有房间，房间权限要在服务端校验。

## 心跳、背压和重连

协议有 Ping/Pong 控制帧，浏览器通常自动处理，但 JS API 不直接开放发送这些控制帧。若业务要观察应用是否响应，可以另外定义心跳消息；不要把 TCP keepalive、WebSocket ping、业务心跳当成同一层机制。

传统浏览器 WebSocket API 不提供 Streams 式自动背压。`bufferedAmount` 能观察本地待发送字节；发送太快时需要限速、合并更新或断开慢连接。它不是服务端已经处理多少字节的确认，也不能控制所有入站缓冲。

断线重连是应用职责，应使用带随机抖动的退避，并设计消息 ID、确认、去重与历史恢复。网络恢复后直接重发“扣款”可能重复执行；应使用业务幂等机制。`close` 的结果也不能证明最后一条消息已经持久化。

WebSocket 没有 CORS 预检许可那套流程。浏览器握手里的 Origin 应在服务端检查，同时认证用户并持续校验操作权限；非浏览器客户端还可以伪造 Origin，不能把它当成用户凭据。详见 [实时通信安全](../../security/engineering/realtime.md)。

资料：[RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)、[RFC 8441（HTTP/2 扩展 CONNECT）](https://www.rfc-editor.org/rfc/rfc8441)、[RFC 9220（HTTP/3 WebSocket）](https://www.rfc-editor.org/rfc/rfc9220)。
