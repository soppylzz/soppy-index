# 计算机网络：从接入网络到解释一次请求

为什么电脑连上 Wi-Fi 仍然打不开网页？为什么服务器只有一个 443 端口，却能接住很多连接？学习网络时，先把“找到谁、怎样送到、如何确认、如何解释”串起来，再记协议细节和面试结论。

本目录按六章组织知识笔记，报文和代码片段用于解释机制，不包含可运行 demo。初学者可沿目录中的阅读顺序学习，面试复习可直接跳到具体问题。

## 机器怎样找到彼此

- [分层与一次请求](foundations/model.md)：认识 OSI 七层、TCP/IP 四层，以及域名、IP、端口分别解决什么问题。
- [IP、子网、DHCP 与路由](foundations/ip.md)：从电脑获得地址开始，判断同网段、默认网关、公网/内网与 NAT。
- [DNS](foundations/dns.md)：从域名查到服务地址，理解递归、迭代、记录和缓存。

先用自己的话描述：新电脑接入网络后，怎样知道自己的地址、DNS 服务器，以及访问外网时该把包交给谁。

## 进程怎样建立连接

- [TCP 与 UDP](transport-security/transport.md)：字节流、数据报、握手、可靠性、关闭连接。
- [TCP 序号、窗口与重传](transport-security/transport-details.md)：通过具体数字解释 ACK、SACK、流量控制与拥塞控制。
- [socket 接口与连接数](transport-security/socket.md)：`bind/listen/accept/connect`、Unix domain socket、四元组、队列与连接上限。
- [TLS 1.2 与 1.3](transport-security/tls.md)：证书、密钥协商、两代握手、会话恢复及 0-RTT。

学到这里，应能区分 TCP 建连、TLS 握手和应用登录，也能解释“一个端口为什么可以服务多个客户端”。

## HTTP 怎样传递内容

- [HTTP 语义、状态码与字段](http/http.md)：请求/响应、方法、header、缓存和错误归属。
- [HTTP 消息与内容传输](http/http-transfer.md)：消息边界、压缩、流式读取、范围请求与条件更新。
- [HTTP 版本、QUIC 与代理](http/http-versions.md)：从 H1 排队推导 H2 复用与 H3 的改进，认识 CDN 和反向代理。
- [CORS 与预检](http/cors.md)：跟随一次跨源 JSON 请求，理解 OPTIONS、凭据和响应读取限制。

缓存机制的浏览器细节见 [HTTP 缓存](../browser/cache/http-cache.md)；安全策略继续读 [源与 CORS](../security/foundations/origin-cors.md)。本目录侧重报文流转和网络边界。

## 分发、缓存与网络优化

- [CDN 与资源更新](delivery-optimization/cdn.md)：边缘节点、回源、缓存键、hash 资源、刷新与发布顺序。
- [Cloudflare 的流量路径](delivery-optimization/cloudflare.md)：网站代理、源站保护、Tunnel、客户端通道与 Workers 转接。
- [unpkg 与 npm](delivery-optimization/unpkg.md)：包发布、版本 URL、浏览器模块、import map 与依赖分发。

这一部分在 HTTP 之后阅读：先理解缓存语义，再判断资源在哪里被缓存、更新时哪些入口需要变化，以及流量究竟经过哪一段代理。

## 持续通信、P2P 与隧道

- [实时通信如何选型](realtime-tunnels/realtime.md)：先确定数据方向，再比较轮询、SSE、WebSocket 与 WebRTC。
- [SSE](realtime-tunnels/sse.md)：HTTP 事件流、自动重连、事件 ID 与流式解析。
- [WebSocket](realtime-tunnels/websocket.md)：握手、消息帧、socket 命名、心跳与恢复。
- [WebRTC 与 NAT 穿透](realtime-tunnels/webrtc.md)：信令、NAT 类型、打洞、ICE、STUN、TURN。
- [TUN、TAP 与隧道](realtime-tunnels/tun.md)：虚拟网卡如何把 IP 包交给用户态程序，为什么 VPN 能影响应用流量。

## 排障和面试推演

- [常用 CLI 与抓包](diagnostics-interview/diagnostics.md)：按地址、路由、DNS、端口、TLS、HTTP 的顺序建立证据。
- [面试推演](diagnostics-interview/interview.md)：从握手、连接数、消息边界到版本与实时通信，用条件和反例检验答案。

初学者按顺序阅读，第一次可以略过 TCP 进阶和隧道实现。面试复习先读推演题，遇到解释不清的地方回到对应章节，不必从头重背。

贯穿这些章节的一条链路是：

```text
DHCP / manual configuration → local address, prefix, gateway, DNS resolver
URL → DNS → route → TCP + TLS or QUIC → HTTP → application
```

这不是每次请求都完整重复的执行顺序：路由选择也发生在 DNS 查询时；缓存、连接复用、代理会省略或拆分阶段。文中的地址和报文多为教学示意，具体行为以协商版本和实际环境为准。各篇附有协议规范入口。
