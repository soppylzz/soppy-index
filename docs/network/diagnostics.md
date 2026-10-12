# 从 DevTools 到 Wireshark：按层排障

## 1. 先固定现象

记录 URL、时间、网络、浏览器版本、是否首次访问、是否使用代理/VPN、错误码。用同一地址比较“浏览器失败 / curl 成功”时，先考虑缓存、CORS、证书信任、扩展、Service Worker、Cookie 与代理配置差异。一次抓包无法证明普遍规律。

| 现象          | 先看哪层        | 证据                                     |
| ------------- | --------------- | ---------------------------------------- |
| 域名解析失败  | DNS             | `dig` 的返回码、答案与解析器             |
| 连接超时/拒绝 | IP/TCP/UDP      | SYN 是否有回复、ICMP、目标端口           |
| 证书错误      | TLS             | SNI、证书链、域名、时间                  |
| 收到 4xx/5xx  | HTTP/应用       | 方法、路径、响应头、服务端日志           |
| 浏览器报 CORS | 浏览器策略/HTTP | 预检、Origin、响应头；确认请求是否已到达 |
| WebRTC 无连接 | ICE/NAT         | 候选对、STUN 检查、TURN 分配与统计       |

## 2. 抓包的基本步骤

1. 在有权限的测试环境中确定抓包网卡、时间范围和目标域名/IP。先用 DevTools Network 导出请求时间线，再用 `curl -v` 稳定复现。
2. Wireshark 过滤 `dns`、`tcp.port == 443`、`tls` 或 `udp.port == 443`。显示过滤器与采集过滤器语法不同；先少量抓取，避免大量无关数据。
3. HTTP/1.1 明文可按 `tcp.stream eq N` Follow TCP Stream；TLS/QUIC 默认只能看握手元数据和加密包，不能直接读 HTTP 内容。测试环境如需解密，可配置受控的会话密钥日志，并及时删除。
4. 将浏览器时间线与报文时间戳对齐。重传、乱序和窗口变化是线索，不等于根因；检查网络两端、服务端日志与代理指标。

```bash
dig example.com A
curl -v --http1.1 https://example.com/
openssl s_client -connect example.com:443 -servername example.com
```

`curl` 报出的 DNS、connect、TLS 和首字节时间可帮助缩小范围，但连接复用、代理、缓存与远端处理会影响解释。抓到包后问“这一包属于哪一层、期望下一个回应是什么、回应实际在哪里消失”，比背错误码更有用。

## 3. 面试复盘模板

从 URL 到 DNS，确认目标地址；从 SYN/QUIC Initial 到连接确认；从 TLS 到证书和 ALPN；从 HTTP 到方法、缓存、状态与响应体；最后看浏览器策略和渲染。若中途经过 CDN/代理，应明确观察点是在客户端到边缘节点，还是边缘到源站。回到 [课程入口](README.md)可按失败阶段复习对应篇章。
