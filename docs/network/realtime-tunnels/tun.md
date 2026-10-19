# TUN、TAP 与隧道：把网络包交给一个程序

开启 VPN 后，应用代码没变，为什么很多请求都换了一条路径？一种常见方式是创建虚拟网络接口，再修改路由，让选中的包进入这个接口。TUN 就是这样的接口机制之一，不是 HTTP 协议，也不是 NAT 类型。

## 虚拟网卡两端分别是谁

以 Linux TUN 为例，一端连接内核网络栈，另一端让用户态程序通过文件描述符读写 IP 包。路由选择把包送入 TUN 后，程序读到它；程序把包写入 TUN，则相当于向内核注入从该接口收到的包。

```text
Application → TCP/IP stack → route → TUN
                                      ↓ read IP packet
                                Tunnel program
                                      ↓ encrypt + encapsulate
Physical interface → tunnel server → destination
```

实际传输到远端仍需物理网络。程序可能把原始 IP 包加密后装进 UDP 等外层报文，远端解封装后再路由或转发；返回路径反向进行。TUN 本身不提供加密、远端服务器或自动上网能力，这些由隧道协议、程序和路由配置实现。

下面是概念伪代码，接口初始化、包校验、加密与错误处理均省略：

```text
outgoing = read_packet(tun_fd)
protected = encrypt_and_encapsulate(outgoing)
send_to_peer(transport_socket, protected)

incoming = receive_from_peer(transport_socket)
packet = authenticate_and_decapsulate(incoming)
write_packet(tun_fd, packet)
```

注意隧道程序发往对端的外层流量必须走可达的物理路径。如果也被默认路由重新送回 TUN，就会产生路由递归。实现通常需要给隧道服务器保留例外路由，或使用系统提供的策略路由/接口绑定机制。

## TUN 和 TAP 差在哪

| 接口 | 用户态读写内容 | 抽象层次 |
| ---- | -------------- | -------- |
| TUN  | IP 包          | 三层     |
| TAP  | Ethernet 帧    | 二层     |

TAP 可以承载以太网广播与 ARP 等二层内容，适合某些虚拟交换/桥接场景；TUN 更贴近 IP 路由。不要把 Linux 设备名称、配置方式当成跨平台统一 API；例如 macOS 有 utun 机制。

## TUN 与代理、NAT、TURN 的区别

HTTP/SOCKS 代理通常由应用或系统代理设置把连接交给代理；TUN 在 IP 路由层接收选中的包，能覆盖不主动理解代理设置的应用，但实际覆盖范围仍取决于路由、协议支持和程序实现。

NAT 改地址和端口；TUN 提供虚拟接口；TURN 为 WebRTC 等客户端提供中继分配与转发。这些机制可以组合，不能互相替代。例如一个 VPN 服务端可以解封装隧道，再通过 NAT 转发到互联网。

## 全局模式为什么还要检查 DNS 和 MTU

默认路由进隧道不等于所有 DNS 都按预期解析。系统解析器、浏览器加密 DNS、分流规则和 IPv6 路由都可能影响路径，需要分别检查。

外层头和认证数据增加包长，隧道内有效 MTU 通常需相应减小。若内层包已经接近物理链路上限，再封装就可能分片或丢弃；这能解释某些“开 VPN 后小请求正常、大文件卡住”的现象。排障先查看接口、路由、DNS 与路径 MTU，而不是只看应用代理开关。

资料：[Linux Kernel：Universal TUN/TAP device driver](https://docs.kernel.org/networking/tuntap.html)。

Cloudflare Tunnel 采用 connector 出站建立的连接来发布服务，与这里的 TUN 接口名称相近但职责不同；具体路径见 [Cloudflare](../delivery-optimization/cloudflare.md)。
