# socket：进程操作网络的接口

服务器只监听 `:443`，为什么可以同时和许多客户端通信？关键是区分监听端点和每条已连接端点。socket 是操作系统提供的通信端点抽象；TCP 是它可以使用的一种传输协议。socket 本身不是另一种与 TCP 并列的网络协议。

## 从接口顺序理解客户端和服务端

下面是 POSIX 风格的 C 伪代码，只展示调用关系；地址构造、返回值检查和清理省略，不能作为完整服务运行。

```c
int listener = socket(AF_INET, SOCK_STREAM, 0);
bind(listener, local_address, address_length);
listen(listener, backlog);

int connection = accept(listener, peer_address, peer_address_length);
recv(connection, buffer, capacity, 0);
send(connection, response, response_length, 0);
close(connection);
```

`socket` 创建端点；`bind` 指定本地地址和端口；`listen` 让它等待连接；`accept` 取出已建立连接并返回一个新的文件描述符。`listener` 继续接收其他连接，读写发生在 `connection` 上。一次 `accept` 不会占用一个新的服务端监听端口。

客户端通常是：

```c
int connection = socket(AF_INET, SOCK_STREAM, 0);
connect(connection, server_address, address_length);
send(connection, request, request_length, 0);
recv(connection, buffer, capacity, 0);
close(connection);
```

客户端没有显式 `bind` 时，系统通常自动选择源 IP 和临时端口。阻塞 `connect` 成功表示传输连接已经建立，不能说明 TLS 验证或应用登录成功。`send` 返回成功通常只表明数据被本地系统接受；`recv` 返回多少字节也不代表收到完整业务消息。真实代码要处理部分读写、超时、错误和关闭。

UDP 常用 `SOCK_DGRAM`，配合 `sendto/recvfrom`，不需要 TCP 式 `listen/accept`。UDP 也可以调用 `connect` 设置默认对端及相关过滤/错误处理行为，这个调用不产生 TCP 三次握手。

## 一个端口怎样区分多条连接

在 TCP 范围内，一条连接通过源 IP、源端口、目标 IP、目标端口的四元组区分。把传输协议也写进来，就是常说的五元组。

```text
192.0.2.10:51000 → 198.51.100.20:443
192.0.2.10:51001 → 198.51.100.20:443
192.0.2.11:51000 → 198.51.100.20:443
```

三个连接都到服务端 443，四元组仍不相同。监听 socket 按本地端点接收新连接；已连接 socket 关联具体对端。监听 `0.0.0.0` 表示通配本机 IPv4 地址，不表示客户端应连接到 `0.0.0.0`；监听 `127.0.0.1` 则通常仅允许本机回环访问。

## 连接数为什么不是 65535

端口字段是 16 位，限制的是一个端口空间的取值，不是整台服务器的 TCP 连接总数。

若固定一个客户端源 IP，并固定一个服务端 IP 与端口，客户端可用的临时源端口会限制这组条件下的并发连接数，还受保留端口、现有连接和 TIME_WAIT 等影响。增加源 IP 或目标端点会改变四元组空间；实际系统是否自动复用源端口，还取决于绑定方式和内核规则。

服务端面对很多不同客户端时，同一监听端口可接收远超 65535 条连接。先到的瓶颈可能是进程文件描述符、系统资源、每连接缓冲区、CPU、带宽、应用队列，或者上游 NAT 的映射容量。不能只算四元组空间就承诺机器的可承载容量。

假设每条连接平均消耗 64 KiB，十万条仅这一项约需 6.1 GiB；这只是预算示意，真实开销必须测量，包括内核与应用内存。并发连接数、每秒新建连接数、每秒请求数是三个不同指标；HTTP/2 在一条连接上可以承载多个请求流。

## listen 的 backlog 不是什么

在 Linux 常见模型中，未完成握手的请求和已完成握手但尚未被应用 `accept` 的连接，分别涉及 SYN 队列和 accept 队列。`listen(backlog)` 主要影响后一类队列，并受系统上限约束；SYN cookies 等机制也会影响实现行为。

`accept` 不是应用亲手完成第三次握手，而是取出内核已建立的连接。队列满时可能出现丢包、重试、超时或复位，取决于系统和配置。backlog 不是已被应用接收后可保持的连接总上限。慢慢 `accept`、慢慢读取和链路带宽不足，应使用不同证据区分。

## Unix domain socket 为什么也叫 socket

socket 是端点抽象，地址族决定它处于哪个通信域。`AF_INET/AF_INET6` 使用 IP 地址和端口；`AF_UNIX` 用于同一主机进程通信，常用文件系统路径寻址，Linux 还提供抽象命名空间。

```js
import net from "node:net"

const networkEndpoint = net.createConnection({ host: "127.0.0.1", port: 8080 })
const localEndpoint = net.createConnection({ path: "/tmp/app.sock" })
```

这两行仅对比 Node 接口，要求各自已有服务监听。Unix domain socket 的流类型同样没有业务消息边界；它无需经过 IP 路由、TCP 握手和公网 NAT。路径对应的 socket 节点也不是拿来保存消息的普通文件，访问权限与对端身份应按平台机制管理。

WebSocket 是应用层消息协议，给 Web 应用提供类似持久双向端点的能力。它的名称不表示浏览器可以直接调用系统任意 socket，也不表示它基于 Unix domain socket。

资料：[Linux socket(2)](https://man7.org/linux/man-pages/man2/socket.2.html)、[accept(2)](https://man7.org/linux/man-pages/man2/accept.2.html)、[listen(2)](https://man7.org/linux/man-pages/man2/listen.2.html)、[unix(7)](https://man7.org/linux/man-pages/man7/unix.7.html)、[Node net](https://nodejs.org/api/net.html)。队列和资源限制属于平台实现，不应当成所有操作系统的统一协议规定。
