# 实验讲解：应用消息与传输边界

先读 [TCP/UDP](../transport.md) 再运行 [入口](index.ts)。实验分别在本机 TCP 与 UDP 上传两条应用消息 `alpha`、`beta`。端口由系统分配，日志中的端口是本次运行的实测值。

| 观察                                        | 预测                                        | 原因                                                  |
| ------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- |
| TCP 客户端一次 `write` 两个带长度前缀的消息 | 服务端能解出两条 `tcp-app-message`          | 前两个字节写明每条消息的长度                          |
| `tcp-data-event` 的次数和字节数             | 不保证刚好两次，也不保证与 `write` 次数相同 | TCP 是字节流，读取边界由缓存与调度决定                |
| UDP 客户端两次 `send`                       | 服务端收到两个 `udp-datagram` 事件          | UDP 保留每个数据报的边界；到达顺序/成功仍不被协议保证 |

核心代码：

```ts
const length = pending.readUInt16BE(0)
if (pending.length < length + 2) break
const message = pending.subarray(2, length + 2).toString()
pending = pending.subarray(length + 2)
```

当 TCP 数据还不够组成完整消息时，解析器保留剩余字节等待下次 `data`；足够时可以在一次事件里解析多条消息。完整实现还包含服务端绑定、超时和资源清理，请看 [index.ts](index.ts)。这里的日志只能证明 Node 应用收到的事件；若要观察实际 TCP 段或 UDP 包，用 Wireshark 抓 loopback，并记住网卡卸载和抓包位置会影响所见报文。不要用一次运行的 `tcp-data-event` 次数推导协议保证。

Wireshark 可用显示过滤器 `tcp.port == <日志端口>` 和 `udp.port == <日志端口>` 分开看；把尖括号替换成实际数字。用 Follow TCP Stream 会看到长度前缀与两个消息连在一条字节流里。若需要分析握手、ACK 和窗口，继续读 [TCP 进阶](../transport-details.md)与 [抓包指南](../diagnostics.md)。
