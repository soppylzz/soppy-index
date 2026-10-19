# 网络面试推演：把结论放回条件里

面试回答可以先给结论，再解释机制，最后说明条件或反例。下面围绕常见追问组织，不要求背固定措辞；解释不了时，回到链接章节画出消息或端点。

## 为什么握手是三次，不是两次

握手交换双方初始序号，并确认双方序号空间。客户端收到 SYN+ACK 后确认服务端收到了自己的 SYN，但服务端还需要最终 ACK 确认客户端接受了自己的序号。仅两次就建立状态，延迟到达的旧 SYN 还可能让服务端为并不存在的新连接保留资源。

不要只背“确认双方收发正常”，还要能在 [TCP 时序](../transport-security/transport.md) 上指出谁此时知道了什么。追问第三次 ACK 丢了：服务端可能重传 SYN+ACK，客户端可以再次确认；若后续合法数据携带相应 ACK，也能使服务端完成状态推进。不是任何一包丢失都要求从第一步重来。

## 为什么断开常画四次，TIME_WAIT 在等什么

TCP 两个方向可独立关闭，一方 FIN 后另一方仍可发送数据，所以常见 FIN、ACK、FIN、ACK。报文可能合并，也可能同时关闭，不能说一定是四个包。

正常主动关闭方通常进入 TIME_WAIT，用于处理旧重复报文和最终 ACK 丢失后的 FIN 重传；同时关闭时两端也可能进入。协议讨论常用 2MSL，实际持续时间看系统实现。若大量连接停在 CLOSE_WAIT，往往要查应用为何还未完成本地关闭，而不是去改 TIME_WAIT。见 [TCP 关闭](../transport-security/transport.md)。

## 一个 443 端口能建立多少连接

先说连接通过四元组区分，再问固定哪些条件。服务端一个监听端口可接很多不同客户端，不受“总共 65535 条”的统一上限约束。固定单个客户端 IP 到同一个服务端 IP:port 时，临时源端口空间才成为重要约束；还有 FD、内存、队列与 NAT 限制。

追问 `accept` 是否返回新端口：它返回新的已连接 socket 描述符，服务端本地端口仍可为 443。追问 backlog：它限制等待接收的连接队列相关容量，不等于业务已保持的连接总数。完整推导见 [socket 与连接数](../transport-security/socket.md)。

## TCP 粘包怎么解决，UDP 就没有边界问题吗

TCP 没有业务消息边界，不能假设一次 write 对应一次 read。可以用固定长度、分隔符或长度前缀，让接收端跨读取保留数据，并在一次读取中解析多条消息。

```js
function encodeMessage(text) {
  const body = Buffer.from(text, "utf8")
  const header = Buffer.alloc(4)
  header.writeUInt32BE(body.length)
  return Buffer.concat([header, body])
}
```

这里长度是字节数，不是 JavaScript 字符串长度。接收端应先读够头，再验证长度上限、等待完整 body，并继续处理剩余数据；否则恶意长度可能耗尽内存。UDP 保留数据报边界，但接收缓冲不足可能截断，大报文也可能遭遇 IP 分片和丢失，边界不等于可靠交付。见 [传输机制](../transport-security/transport.md)。

## TCP 可靠，为什么支付还需要幂等

TCP 只在这条连接内提供可靠有序字节流，不保证远端应用处理、提交数据库或响应一定被调用方看到。服务端扣款成功后连接断开，客户端可能只看到超时。重试要用业务幂等键和结果查询，不应依赖“没收到响应所以没执行”。

HTTP 方法幂等指预期效果，不指每次返回相同状态码；DELETE 第二次可以是 404。POST 也能通过业务机制实现安全重试，但不是方法本身自动保证。见 [HTTP 方法](../http/http.md)。

## 有流量控制为什么还要拥塞控制

接收方空闲，不代表中间网络有容量。rwnd 保护接收方，cwnd 约束路径上的在途数据，发送端受两者以及应用数据量共同限制。高带宽、高 RTT 链路要有足够在途数据才可能充分利用带宽；单看链路带宽无法预测吞吐。见 [TCP 窗口](../transport-security/transport-details.md)。

## HTTP/2 已经多路复用，HTTP/3 又解决什么

H2 把多个 stream 的帧交错送进同一 TCP 字节流。TCP 中间丢一段，后续字节要等缺口补齐，多个 HTTP stream 都可能被阻挡。QUIC 提供独立可靠流，某个流的缺失通常不阻挡其他流的数据交付，但共享拥塞与带宽仍有影响。

HTTP/3 基于 UDP 不表示放弃可靠性，可靠流和拥塞控制由 QUIC 实现。也不能推导它在所有网络都更快，UDP 可达性、握手、缓存与服务端工作量都影响结果。见 [HTTP 版本](../http/http-versions.md)。

## TLS 1.2 与 1.3 如何比较

限定常规完整握手、没有重试并排除 TCP 建连时，1.2 通常约 2 RTT，1.3 通常约 1 RTT。1.3 提前发送 key_share、删除静态 RSA 密钥交换和旧密码选择，并加密更多握手内容。1.2 的 ECDHE 同样能提供前向保密。

追问 0-RTT：它依赖先前状态，是可选早期数据，不是每次握手都直接发业务；还要处理重放。追问 RSA 证书：它可以参与签名认证，不等于采用静态 RSA 密钥交换。见 [TLS](../transport-security/tls.md)。

## 预检失败和实际响应被 CORS 拦截一样吗

预检失败通常使本次业务请求不再发送；免预检或已通过预检的业务请求，可能已执行，但实际响应缺少许可字段，导致脚本读不到。因此控制台报 CORS 不能直接推断服务端有没有处理。

追问为什么 curl 正常：curl 不执行浏览器的跨源读取限制。追问是否能防 CSRF：不能替代，因为某些请求可以免预检直接发送。见 [CORS](../http/cors.md)。

## SSE、WebSocket、WebRTC 怎样选择

先回答方向与拓扑。单向通知和文本生成可考虑 SSE；持续双向消息可考虑 WebSocket；P2P 媒体与数据需要考虑 WebRTC 的 ICE 与媒体栈。SSE 客户端仍可用另一个 HTTP 请求提交操作，WebRTC 也可能最终走 TURN 中继。

追问 WebSocket 为什么叫 socket：它提供 Web 上的双向通信协议与 API，但不等于系统 socket，更不等于 Unix domain socket。追问有 STUN 为什么还要 TURN：观察到映射地址不保证候选对可达，受限路径需要中继。见 [实时通信](../realtime-tunnels/realtime.md)、[WebRTC](../realtime-tunnels/webrtc.md)。

## CDN 已经刷新，为什么用户还看到旧页面

先区分源站、CDN、浏览器和 Service Worker 各层状态。purge 不能直接删除用户本地副本；旧 HTML 也可能继续引用旧脚本。发布时常给内容资源换 hash URL，先上传新资源，再更新可验证或短缓存的入口，旧资源保留一段时间供旧页面使用。

追问 query 版本号一定有效吗：要确认 CDN 缓存键是否包含相应参数。追问橙云能否彻底隐藏源站：DNS 不返回源站并不等于无法绕过，应配合源站访问控制或 Tunnel 等连接方式。见 [CDN](../delivery-optimization/cdn.md)和 [Cloudflare](../delivery-optimization/cloudflare.md)。

## npm 装好的包为什么不能直接放到浏览器

包管理器负责获取和解析依赖，浏览器运行还受模块格式、依赖路径和平台 API 限制。unpkg 能提供 npm 包文件，但原始 CommonJS、Node API 或未编译源码并不自动变成浏览器模块；bare specifier 还需要 import map 或构建转换。

追问用了 lockfile 为什么线上依赖还变化：lockfile 不会控制 HTML 中独立的 `@latest` URL。追问固定版本怎样更新：发布新版本并更新引用，不覆盖同名同版本。见 [unpkg 与 npm](../delivery-optimization/unpkg.md)。

## 输入 URL 到页面出现，怎样避免背成流水账

先说明是否命中缓存、是否复用连接、使用哪个 HTTP 版本；再沿 DNS、路由、传输、安全、HTTP 与浏览器处理解释。本地 DHCP 配置并不是每次导航重新执行，HTTP/3 也没有 TCP 握手。遇到 CDN 时区分客户端到边缘和边缘到源站。

最后用可观察证据支撑：DNS 看答案与解析器；传输看连接结果与报文；TLS 看身份和协商；HTTP 看状态、字段与时间；浏览器再看 CORS、缓存和页面处理。入口见 [分层模型](../foundations/model.md)与 [诊断命令](diagnostics.md)。
