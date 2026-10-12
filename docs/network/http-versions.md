# HTTP/1.1、HTTP/2、HTTP/3 与代理

## 1. 先区分语义和传输

三代 HTTP 都表达方法、目标、字段、状态与内容，差异主要在报文如何编码和在连接上并发。性能也受缓存、DNS、TLS、服务端处理和拥塞影响；版本升级并不保证页面一定更快。

| 版本     | 承载与编码               | 并发方式                                     | 主要限制或代价                                           |
| -------- | ------------------------ | -------------------------------------------- | -------------------------------------------------------- |
| HTTP/1.1 | TCP 上的文本报文         | 持久连接，通常多连接并行；流水线很少实际采用 | 同一连接上的响应排队；头重复、连接成本                   |
| HTTP/2   | TCP + TLS 常见，二进制帧 | 多 stream 交错，HPACK 压缩头                 | 一条 TCP 连接丢包仍会阻塞该连接的所有 stream             |
| HTTP/3   | UDP 上的 QUIC，二进制帧  | QUIC stream 并发，QPACK 压缩头               | UDP 路径和部署复杂度；并不消除每个 stream 内部的顺序要求 |

HTTP/2 的 stream 是应用层复用：一个 TCP 丢失的字节仍会阻挡其后所有字节交付给 HTTP/2，即 TCP 层队头阻塞。HTTP/3 把可靠流交给 QUIC，某个流的丢失通常不阻挡其他流的数据交付；拥塞控制与共享带宽仍会相互影响。HTTP/2 Server Push 曾被讨论，但浏览器支持与部署有限，不宜当成常规优化手段。

## 2. QUIC 不是“无可靠性的 UDP”

QUIC 在 UDP 数据报中提供连接 ID、加密、可靠传输、流、丢包恢复、流量与拥塞控制。握手集成 TLS 1.3，连接 ID 使地址改变后有机会迁移；迁移需要路径验证，且仍受对端策略与网络条件约束。QUIC 的 ACK/包号与 TCP 字节序号不是一套机制。0-RTT 有重放限制，不能把所有请求无条件提前发送。

一个常见提问是“HTTP/3 为什么用 UDP”：这样可以在用户态部署新传输协议，避免 TCP 的连接级队头阻塞，并把安全与连接迁移纳入设计；不意味着它绕过拥塞控制或在所有网络中一定更快。

## 3. 代理、CDN、连接不是一对一

```text
浏览器 ──TLS/HTTP──> CDN/反向代理 ──另一条连接──> 源站
```

代理可以终止客户端 TLS，再以另一条连接访问源站；两段的 HTTP 版本也可以不同。CDN 把可缓存内容放到离用户较近的节点，命中、失效、缓存键、个性化数据隔离决定收益与风险。缓存控制与 [HTTP 缓存](http.md)同理，但共享缓存绝不能误存用户私有数据。

正向代理替客户端访问外部服务；反向代理替源站接受请求。`CONNECT` 可建立到目标的隧道。`X-Forwarded-For`、`Forwarded` 等字段只有在可信代理剥离外来值并重写后才能用于安全判断。Host/authority 与 TLS SNI 不一致时可能影响路由和证书验证。

## 4. 观察实际协商

```bash
curl -I -v --http1.1 https://example.com/
curl -I -v --http2 https://example.com/
curl --version
```

`curl --version` 先检查本机编译是否支持 HTTP/3，再尝试 `--http3`。在 DevTools Network 中显示的 protocol 是浏览器与其直接对端协商的版本，不代表 CDN 到源站也使用该版本。

资料：[RFC 9112（HTTP/1.1）](https://www.rfc-editor.org/rfc/rfc9112)、[RFC 9113（HTTP/2）](https://www.rfc-editor.org/rfc/rfc9113)、[RFC 9114（HTTP/3）](https://www.rfc-editor.org/rfc/rfc9114)、[RFC 9000（QUIC）](https://www.rfc-editor.org/rfc/rfc9000)。
