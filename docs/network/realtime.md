# 实时通信：从请求响应到双向流

## 1. 先问数据怎样流动

普通 HTTP 请求响应适合偶发查询；定时轮询简单，但空请求和更新时间间隔有成本。长轮询让服务端等待事件后才应答，收到后客户端立即再请求；要处理超时、重连和并发订阅。它们都能用现有 HTTP 基础设施。

| 方式                | 方向                   | 特征                                                      | 适用例子                     |
| ------------------- | ---------------------- | --------------------------------------------------------- | ---------------------------- |
| 短/长轮询           | 客户端发起，服务端应答 | 兼容性好，需管理重复请求                                  | 低频状态更新                 |
| SSE (`EventSource`) | 服务端 → 客户端        | HTTP 文本事件流，浏览器可自动重连，`Last-Event-ID` 可续传 | 通知、进度、只读推送         |
| WebSocket           | 双向                   | HTTP 握手后变为消息帧协议，长期连接                       | 协作编辑、聊天控制消息       |
| WebRTC DataChannel  | 对等双向               | ICE 建链，SCTP/DTLS；可能经 TURN 中继                     | P2P 数据交换                 |
| WebTransport        | 客户端与服务端双向     | 基于 HTTP/3，支持流和数据报；生态支持需核查               | 同时需要可靠流和低延迟数据报 |

选型看方向、消息可靠性、连接规模、中间代理支持、安全边界和是否必须 P2P。不要因为名称有“实时”就假设网络延迟有硬上限。

## 2. SSE 的流格式

```http
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

event: price
data: {"value": 12}
id: 41

```

空行结束一个事件。服务端需及时刷新缓冲，代理可能缓冲或断开空闲连接；心跳注释行可维持活跃。浏览器重连时可能带 `Last-Event-ID`，但能否补齐遗漏消息取决于服务端保存的事件历史。

## 3. WebSocket 握手与帧

HTTP/1.1 常见握手包含 `Upgrade: websocket`、`Connection: Upgrade`、`Sec-WebSocket-Key` 和版本，服务端返回 `101 Switching Protocols` 与 `Sec-WebSocket-Accept`。此后是 WebSocket 帧，提供文本/二进制消息、ping/pong、关闭控制帧；它不是“永远保持打开的普通 HTTP 响应”。HTTP/2、HTTP/3 有不同的扩展 CONNECT 建立方式。

浏览器 WebSocket API 没有像 Streams 那样的自动背压控制；若生产速度超过消费速度，要限制应用发送队列，观察 `bufferedAmount`。网络断开需自行重连，并设计消息序号、去重、鉴权续期与状态恢复。TCP 的可靠性不能保证“业务消息恰好处理一次”。

```js
const socket = new WebSocket("wss://example.com/events")
socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data)
  console.log(message.id)
})
```

生产代码须校验消息结构、限制大小与处理异常。WebSocket 不受 CORS 读限制那套预检机制保护；服务端应验证 `Origin` 并认证连接，见 [实时连接安全](../security/browser-boundaries.md)。

资料：[RFC 6455（WebSocket）](https://www.rfc-editor.org/rfc/rfc6455)、[HTML Living Standard（SSE）](https://html.spec.whatwg.org/multipage/server-sent-events.html)、[RFC 9220（HTTP/3 WebSocket）](https://www.rfc-editor.org/rfc/rfc9220)。
