# Cloudflare：缓存、隐藏源站与内外网通道

“接入 Cloudflare”可以指多种不同路径。先问流量是谁发起、最终到哪里，再判断需要 DNS、反向代理、Tunnel 还是客户端通道。下面讲机制，不涉及账户配置和套餐操作；产品能力应以链接中的当前官方文档为准。

## 橙云怎样转接网站流量

开启 Proxied（常说的橙云）后，公开 DNS 查询得到的是 Cloudflare 边缘地址，HTTP/HTTPS 请求先到 Cloudflare，再按配置到源站。DNS-only（灰云）则仅提供解析，网站流量直接去记录指向的服务器。[Proxy status](https://developers.cloudflare.com/dns/proxy-status/)解释了这两种状态。

```text
Visitor → Cloudflare edge → origin web server
          TLS endpoint      another TLS connection
```

因此，边缘既能返回静态缓存，也能转发未缓存的 API 请求，并应用适用的 WAF、限流等规则。CDN 与反向代理在同一条请求路径上，但“经过代理”不表示“已经命中缓存”。常规网站代理也不等于任意 TCP/UDP 都能透明转发；协议与端口需核对对应产品。

边缘到源站也应加密和验证身份。Cloudflare 的 Full (strict) 会验证源站证书；Flexible 则使回源段使用 HTTP，不能因为浏览器显示 HTTPS 就以为两段都安全。源站证书的信任范围也要分清：Origin CA 证书面向 Cloudflare 回源验证，不意味着浏览器直接访问源站也会信任。[Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)

## 隐藏 DNS 中的源站 IP，为什么还不够

代理让普通域名查询不直接返回源站地址，但这不等于源站地址永远无法获知。旧 DNS 记录、未代理的子域、同机邮件服务、调试页面和应用主动对外连接，都可能暴露线索。曾经公开过的地址也不会因开启代理就从历史记录中消失。

真正要实现的是：即使有人知道地址，也不能绕过边缘直接访问源站网站。常见做法是让源站入站仅接受 Cloudflare 相关流量，并结合适当的源站认证、虚拟主机与应用校验；单纯检查某个可伪造的 HTTP 字段不够。若使用 IP 允许列表，还要维护官方地址范围，并考虑其他合法入口。相关机制见 [Protect your origin server](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/)。

服务端读取真实访客 IP 时，也只应信任经过可信代理写入的字段。否则攻击者直接访问源站并伪造字段，就能影响日志或基于 IP 的判断。隐藏源站、源站访问控制与访客认证，分别解决不同问题。

## Tunnel 怎样让内网服务被外部访问

家里的服务器在 NAT 后，没有公网入站端口，可以由 `cloudflared` 主动向 Cloudflare 建立出站隧道：

```text
Connection initiation: cloudflared → Cloudflare
Request path: visitor → Cloudflare → tunnel → cloudflared → local service
```

隧道连接建立后，流量可以双向传递；“出站建立”不表示只能向外发送数据。它利用允许的出站连接承载返回流量，不要求在家用路由器上配置公网入站端口，也不要求公网可路由的源站 IP。[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/)

这里没有像 WebRTC 那样让访客与内网服务 UDP 打洞直连：流量经 Cloudflare 转接，connector 必须能访问 Cloudflare，并能连到本地服务。Tunnel 与 [TUN 虚拟网卡](../realtime-tunnels/tun.md)也不是同一个概念。

可以把本地 Web 服务映射到公开 hostname，也可以构建受控的私有网络访问。公开一个管理后台时，可配合 Cloudflare Access 的身份策略；创建 Tunnel 本身不等于已经替应用完成用户鉴权。不同协议的客户端接入方式也不同，不能认为公开 Web 的配置天然适用于所有 SSH/TCP 服务。

## “外网信道”要先区分访问方向

如果意思是“让外部用户访问内网网站”，上面的 Tunnel 是对应路径。如果意思是“让本机访问外部网络时经过 Cloudflare”，则要看 WARP/Cloudflare One Client 这类客户端通道及其路由、分流和组织策略，不能通过给网站域名开橙云来替代。[Cloudflare One Client](https://developers.cloudflare.com/cloudflare-one/team-and-resources/devices/cloudflare-one-client/)

```text
Inbound publishing: visitor → edge → tunnel → private service
Client egress:      client → client tunnel → Cloudflare → destination
```

通道改变的是可达路径、出口和策略执行位置，不会自动保证所有目标都可达、路径更短或带宽更高。DNS 走向、IPv6、分流和服务所在区域都会影响实际结果；应按 [排障章节](../diagnostics-interview/diagnostics.md)检查实际路径。“外网通道”不是某种 CDN 缓存模式。

## Workers 怎样实现应用级转接

Workers 可以在边缘执行逻辑，向上游发起 fetch，再给客户端返回结果。可用于固定 API 的网关、改写路径、重定向和聚合请求。下面只展示固定上游转发，不包含部署步骤：

```js
export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 })
    }
    const incoming = new URL(request.url)
    const upstream = new URL("https://api.example.com/public/status")
    upstream.search = incoming.search
    return fetch(upstream)
  },
}
```

示例把路径限定在公开状态接口，域名是占位值。实际网关还需处理认证、超时、响应字段、缓存和日志；避免把任意用户提供的 URL 直接 fetch 成公共开放代理，也不要无条件转发 Cookie/Authorization。Workers fetch 的运行限制见 [官方 API 文档](https://developers.cloudflare.com/workers/runtime-apis/fetch/)。

这类转接面对的是 HTTP 等应用请求，不是自动将整台电脑的 IP 流量导入通道。反向代理、Tunnel、客户端通道与边缘函数可以组合，但应分别说明每一段连接的终点、认证与缓存行为。
