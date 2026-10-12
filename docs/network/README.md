# 计算机网络：从一次访问读懂协议栈

先回答一个贯穿全章的问题：在地址栏输入 `https://example.com/path` 后，浏览器怎样找到服务器、建立可靠且安全的连接，并把内容交给页面？各篇按这个因果顺序阅读。这里的层是分析工具；真实协议会跨层，例如 QUIC 把可靠传输和连接管理放在 UDP 之上。

| 顺序 | 主题                                       | 读完应能解释                                      |
| ---- | ------------------------------------------ | ------------------------------------------------- |
| 1    | [分层与一次请求](model.md)                 | OSI/TCP-IP 如何对应；封装、解封装和故障边界       |
| 2    | [IP、路由与 NAT](ip.md)                    | IP/端口/网关的职责；公网和私网；NAT 如何影响连接  |
| 3    | [TCP 与 UDP](transport.md)                 | 握手、确认、重传、流量/拥塞控制、关闭；UDP 的取舍 |
| 4    | [DNS](dns.md)                              | 递归/迭代、缓存、记录、HTTPS 记录和排障           |
| 5    | [TLS](tls.md)                              | 证书验证、密钥协商、TLS 1.3、HTTPS 的安全边界     |
| 6    | [HTTP 语义与缓存](http.md)                 | 方法、状态、缓存、内容协商和跨域边界              |
| 7    | [HTTP 版本、QUIC 与代理](http-versions.md) | H1/H2/H3 的帧与阻塞、CDN、反向代理                |
| 8    | [实时通信](realtime.md)                    | 轮询、SSE、WebSocket、WebTransport 的适用场景     |
| 9    | [WebRTC 与 NAT 穿透](webrtc.md)            | 信令、ICE、STUN、TURN、候选地址和媒体安全         |
| 10   | [抓包与排障](diagnostics.md)               | 用 DevTools、curl、Wireshark 定位是哪一层出错     |

配套的 [TCP/UDP 消息边界实验](lab/README.md)可在本机抓包；在主线之外，[TCP 进阶](transport-details.md)拆开序号、窗口与异常报文；[HTTP 传输细节](http-transfer.md)讲消息边界、范围请求和条件更新。建议先读 1–7，再按业务选择 8–9，最后用 10 复盘。浏览器缓存的运行实验见 [Browser Cache](../browser/cache/README.md)，跨域安全策略见 [Security](../security/README.md)。文中的报文是用于理解协议的片段；具体字段和时序以协商版本与实际抓包为准。

## 一条访问链

```text
URL → DNS 得到地址 → IP 路由 → TCP 握手或 QUIC 建连
    → TLS 身份验证与密钥协商 → HTTP 请求/响应
    → 浏览器解析、缓存、渲染
```

这不是每次请求都完整重复的流程：DNS、连接、TLS 会复用或缓存；代理可能终止 TLS；HTTP/3 使用 QUIC 而非 TCP。排查慢请求时，先问“本次实际经过了哪些阶段”，再谈优化。

## 规范入口

本章以 [IETF RFC 索引](https://www.rfc-editor.org/)及相应协议规范为事实基准；每篇末尾给出直接相关的规范。`__reference__/` 保留为早期材料，不是学习入口。
