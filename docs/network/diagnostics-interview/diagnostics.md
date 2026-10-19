# 网络排障：让每个命令回答一个问题

先记录目标 URL、发生时间、网络环境、是否有代理/VPN 和完整错误。然后沿访问链缩小范围。同一台电脑“浏览器失败、curl 成功”不稀奇：两者可能使用不同代理、DNS、缓存、证书信任与 Cookie，curl 也不执行浏览器 CORS 读取限制。

本篇命令是按需查询片段，不是一段要全部执行的脚本。示例接口名需替换为实际名称；不同平台工具未必预装，选项也应以本机帮助为准。

## 先看地址和路由

Linux：

```bash
ip addr
ip route
ip route get 1.1.1.1
```

macOS：

```bash
ifconfig
route -n get default
route -n get 1.1.1.1
scutil --dns
```

Windows PowerShell：

```powershell
ipconfig /all
Get-NetRoute
Test-NetConnection example.com -Port 443
```

确认地址、前缀、默认网关、DNS 和目标路由。不要只看“有 IP”；链路本地地址、错误网关、隧道路由都可能解释无法访问。`0.0.0.0` 在监听地址里表示通配，本机回环 `127.0.0.1` 不代表公网入口。

## DNS 有没有回答，谁回答的

```bash
dig example.com A
dig example.com AAAA
dig example.com CNAME
dig +trace example.com
nslookup example.com
```

检查返回码、答案、TTL 和 SERVER。`NXDOMAIN` 表示名称不存在，`SERVFAIL` 表示解析失败，超时表示未及时得到应答，它们不是同一种故障。`+trace` 逐级查询可能被网络策略阻断；dig 直接查 DNS，不必完全等同于浏览器或系统实际解析路径。

如果知道正确目标 IP，可以临时绕过 DNS 对比：

```bash
curl -v --resolve example.com:443:203.0.113.10 https://example.com/
```

这仍保留 URL 的主机名用于 SNI 和 HTTP 站点选择。示例 IP 是保留文档地址，必须换成实际服务地址；直接把 URL 改成 IP 会同时改变证书和虚拟主机条件。

## 路径和端口是否可达

```bash
ping -c 4 example.com
traceroute example.com
nc -vz example.com 443
```

上面是 Unix 常见语法，Windows 可用 `ping -n 4`、`tracert` 和 `Test-NetConnection`。ping 使用 ICMP，nc 这里测试 TCP；一种失败不能直接推出另一种失败。traceroute 中间出现星号可能只是路由器不回复探测，并不必然是流量在此中断。TCP 成功也不能证明 TLS 或 HTTP 正常。

UDP 没有相同意义的握手，`nc -u` 没报错不能证明远端服务已收到数据；应使用能获得应用响应的协议探测或双端日志。

## 谁在监听，连接处于什么状态

Linux：

```bash
ss -lnt
ss -tan state established
ss -tan state time-wait
ss -s
```

macOS：

```bash
lsof -nP -iTCP:443 -sTCP:LISTEN
netstat -anv -p tcp
```

Windows PowerShell：

```powershell
Get-NetTCPConnection -State Listen
Get-NetTCPConnection -State Established
```

先确认监听地址，再看连接状态。大量 `SYN-SENT` 可提示握手迟迟不完成；大量 `CLOSE-WAIT` 应检查应用是否在收到对端 FIN 后及时关闭；`TIME-WAIT` 多可能只是高连接周转，不应直接调低安全等待时间。查看其他用户的进程信息或某些系统参数可能需要额外权限。

## 分离 TLS、HTTP 和等待时间

```bash
curl --version
curl -v --http1.1 https://example.com/
curl -v --http2 https://example.com/
curl -I https://example.com/
curl -N https://example.com/events
```

先确认 curl 的编译能力；`--http2` 可能协商回退，应看最终版本。`-I` 发 HEAD，不代表 GET 的响应体也没有问题；`-N` 关闭 curl 自身的输出缓冲，适合观察 SSE，不能关闭远端代理的缓冲。

```bash
curl -sS -o /dev/null -w 'dns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} first_byte=%{time_starttransfer} total=%{time_total}
' https://example.com/
```

这些时间通常是从开始计时的累计值，不是每阶段各自耗时。对直接新建 HTTPS/TCP 连接，可用相邻累计值的差近似拆分；连接复用、代理、重定向和 QUIC 会改变解释。首字节等待还包含网络和服务端处理，不能全部叫作“后端执行时间”。

TLS 身份与版本检查见 [TLS](../transport-security/tls.md)。收到 4xx/5xx 表示已得到 HTTP 响应，接着核对方法、路径、认证和网关日志；不要继续只查 DNS。

## 复现一次预检

```bash
curl -i -X OPTIONS https://api.example/items/42 -H 'Origin: https://app.example' -H 'Access-Control-Request-Method: PATCH' -H 'Access-Control-Request-Headers: content-type'
```

检查允许源、方法、字段和凭据响应，再检查实际业务响应是否也带许可字段。curl 只是帮你看报文，不会替浏览器决定 CORS 通过与否。完整机制见 [CORS](../http/cors.md)。

## 抓包补齐哪一段证据

在有权限的环境中，先确定网卡、时间范围和目标。下面只展示命令，不在本次文档重构中执行：

```bash
tcpdump -D
tcpdump -ni en0 -c 100 'tcp port 443'
```

抓包通常需要系统权限；loopback 的接口名在 macOS 常为 `lo0`、Linux 常为 `lo`。Wireshark 可用显示过滤器 `dns`、`tcp.port == 443`、`udp.port == 443`、`tcp.stream eq 0`，它们与 tcpdump 的采集过滤语法不同。

观察 SYN 是否发出、是否收到 SYN+ACK、谁发 FIN/RST、是否出现重复 ACK 或窗口下降。TLS/QUIC 默认看不到 HTTP 明文；解密需要受控环境里的会话密钥。单侧抓包、网卡卸载和分析器推断会影响所见，不能凭一处“重传”标签确定丢包根因。

WebRTC 可查看浏览器连接统计和候选对：先确认 ICE 选中的是 host/srflx/relay，再看丢包、RTT 和媒体轨道。若经过 CDN 或代理，客户端抓包只覆盖到直接对端，源站那段还需要另一侧日志与观测。

资料：[curl 手册](https://curl.se/docs/manpage.html)、[OpenSSL s_client](https://docs.openssl.org/3.0/man1/openssl-s_client/)、[iproute2 ss](https://man7.org/linux/man-pages/man8/ss.8.html)、[tcpdump 手册](https://www.tcpdump.org/manpages/tcpdump.1.html)。
