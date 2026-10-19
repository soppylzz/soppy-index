# SSE：在一个 HTTP 响应里持续发送事件

生成式文本、订单进度、通知订阅的共同点是：客户端先订阅，之后服务端不断产生更新。SSE（Server-Sent Events）定义了适合这类场景的 UTF-8 文本事件格式；浏览器的 `EventSource` 负责发起请求、解析和重连。

## 空行结束事件，TCP 分段不结束事件

下面是 HTTP/1.1 响应的语义片段，省略传输分块等细节：

```text
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache

id: 41
event: progress
data: {"percent":25}

: heartbeat

id: 42
event: progress
data: {"percent":50}

```

每个空行结束一个事件块；`event` 指定事件名，省略时通常派发 `message`；多个 `data:` 行会用换行拼接。冒号开头是注释，可用于心跳。`retry:` 的合法整数值可提示重连等待时间，单位毫秒。

一次底层读取可能只得到半行，也可能得到多个事件。HTTP chunk、TCP segment、SSE event 是三种边界，不能把 `reader.read()` 的一次返回当成一个 JSON。原生 EventSource 会处理 SSE 格式；用 fetch 自己读流时，要维护 UTF-8 解码和跨块缓冲。

## 浏览器怎样订阅和停止

```js
const events = new EventSource("/events")

events.addEventListener("progress", (event) => {
  const update = JSON.parse(event.data)
  console.log(event.lastEventId, update.percent)
})
events.addEventListener("error", () => {
  console.log("Event stream interrupted", events.readyState)
})

// Call when the subscription is no longer needed.
function unsubscribe() {
  events.close()
}
```

这里假设服务端发送可信结构的 JSON，真实应用仍需验证数据。error 不一定意味着永久终止：浏览器可能正在尝试重连。服务端返回 `204 No Content` 可以告诉 EventSource 停止重连。

原生 EventSource 使用 GET，构造参数不提供任意请求体和自定义 Authorization header。跨源订阅需要 CORS；若需要 Cookie 凭据，可配置 `{ withCredentials: true }`，同时满足服务端许可和 Cookie 策略。不要为绕过 API 限制随意把长期凭据放进 URL。

## 自动重连不等于自动补消息

浏览器记录事件 `id` 后，在重连请求中可发送 `Last-Event-ID`。服务端需要按该 ID 查询历史并发送缺失事件，或者明确告知客户端重新获取快照。如果历史已过期，浏览器不会凭空恢复。

消费端还要考虑重复投递以及重载页面后游标是否持久化。`id` 不是数据库事务或业务处理成功的确认，事件到达与页面完成业务操作是不同阶段。

## 为什么服务端写了，页面却迟迟没显示

应用框架、压缩层、反向代理和 CDN 都可能缓冲输出。事件应及时刷新，代理应配置适合流式响应的缓冲与超时策略；心跳间隔要考虑路径上的空闲超时。`Cache-Control: no-cache` 本身不会强迫所有中间层立即刷新。

HTTP/1.1 下长期 SSE 响应会占用一条连接，多标签页可能触及浏览器对同源的连接限制；HTTP/2 可以复用多个 stream，但仍受流数量和资源限制。SSE 不依赖 chunked 才能成立，HTTP/2/3 同样能承载事件流。

LLM 接口常通过 POST + fetch 返回 SSE 格式，适合携带输入内容；这不等于使用了原生 EventSource，也不会自动获得其重连行为。是否重试生成请求还需考虑重复生成和计费等业务语义。

资料：[HTML Standard：Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)。
