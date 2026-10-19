# HTTP/1.1、HTTP/2、HTTP/3 与代理

## 先区分语义和传输

三代 HTTP 都表达方法、目标、字段、状态与内容，差异主要在报文如何编码和在连接上并发。性能也受缓存、DNS、TLS、服务端处理和拥塞影响；版本升级并不保证页面一定更快。

| 版本     | 承载                  | 并发与头压缩             |
| -------- | --------------------- | ------------------------ |
| HTTP/1.1 | TCP                   | 持久连接，常用多连接并行 |
| HTTP/2   | TCP，Web 中通常加 TLS | stream 复用、HPACK       |
| HTTP/3   | QUIC over UDP         | 独立可靠流、QPACK        |

HTTP/1.0 常见做法是每次响应后关闭连接，也存在非默认的持久连接扩展；HTTP/1.1 默认支持持久连接，但复用不等于可以随意并发交错响应。H1 流水线按请求顺序返回，前一个响应慢会让后面等待，浏览器通常不依赖它，而是使用多连接。

HTTP/2 把头和数据拆成帧，用 stream ID 归属请求；多个请求的帧可以交错，较慢响应不必在 HTTP 层挡住所有其他响应。HPACK/QPACK 压缩的是字段信息，不会代替 gzip/br 之类的内容压缩。

HTTP/2 的 stream 是应用层复用：一个 TCP 丢失的字节仍会阻挡其后所有字节交付给 HTTP/2，即 TCP 层队头阻塞。HTTP/3 把可靠流交给 QUIC，某个流的丢失通常不阻挡其他流的数据交付；拥塞控制与共享带宽仍会相互影响。HTTP/2 Server Push 曾被讨论，但浏览器支持与部署有限，不宜当成常规优化手段。

## QUIC 不是“无可靠性的 UDP”

QUIC 在 UDP 数据报中提供连接 ID、加密、可靠传输、流、丢包恢复、流量与拥塞控制。握手集成 TLS 1.3，连接 ID 使地址改变后有机会迁移；迁移需要路径验证，且仍受对端策略与网络条件约束。QUIC 的 ACK/包号与 TCP 字节序号不是一套机制。0-RTT 有重放限制，不能把所有请求无条件提前发送。

一个常见提问是“HTTP/3 为什么用 UDP”：这样可以在用户态部署新传输协议，避免 TCP 的连接级队头阻塞，并把安全与连接迁移纳入设计；不意味着它绕过拥塞控制或在所有网络中一定更快。

## 代理、CDN、连接不是一对一

```text
浏览器 ──TLS/HTTP──> CDN/反向代理 ──另一条连接──> 源站
```

代理可以终止客户端 TLS，再以另一条连接访问源站；两段的 HTTP 版本也可以不同。CDN 把可缓存内容放到分布式边缘节点，命中、失效、缓存键、个性化数据隔离决定收益与风险。具体回源与发布策略见 [CDN 与资源更新](../delivery-optimization/cdn.md)，网站代理及内网访问路径见 [Cloudflare](../delivery-optimization/cloudflare.md)。

正向代理替客户端访问外部服务；反向代理替源站接受请求。`CONNECT` 可建立到目标的隧道。`X-Forwarded-For`、`Forwarded` 等字段只有在可信代理剥离外来值并重写后才能用于安全判断。Host/authority 与 TLS SNI 不一致时可能影响路由和证书验证。

## 观察实际协商

```bash
curl -I -v --http1.1 https://example.com/
curl -I -v --http2 https://example.com/
curl --version
```

`curl --version` 先检查本机编译是否支持 HTTP/3，再尝试 `--http3`。在 DevTools Network 中显示的 protocol 是浏览器与其直接对端协商的版本，不代表 CDN 到源站也使用该版本。

资料：[RFC 9112（HTTP/1.1）](https://www.rfc-editor.org/rfc/rfc9112)、[RFC 9113（HTTP/2）](https://www.rfc-editor.org/rfc/rfc9113)、[RFC 9114（HTTP/3）](https://www.rfc-editor.org/rfc/rfc9114)、[RFC 9000（QUIC）](https://www.rfc-editor.org/rfc/rfc9000)。
