# CDN 与资源更新：请求在哪里被回答

一个网站把图片、脚本放到 CDN 后，为什么用户可能更快看到页面，源站压力也下降了？关键是将可复用响应放到分布式边缘节点，让请求有机会在靠近用户的网络位置被回答。CDN 是一组分发、代理和缓存能力，缓存规则与发布方式决定它是否有效。

## 从域名到边缘，再决定是否回源

域名接入 CDN 后，DNS 和网络路由把用户引向服务节点。供应商可以使用 DNS 调度、Anycast 等机制；“近”指网络路径与调度结果，不保证地理距离最短。

```text
Browser → CDN edge → cache lookup
                      ├─ fresh hit → response
                      └─ miss / revalidate → origin → edge → browser
```

命中新鲜缓存时，边缘可直接返回响应。未命中时，边缘向源站请求，并根据规则决定是否保存。缓存过期时，可以用 ETag 等验证：源站返回 304，边缘复用已有 body；若表示已变则获取新内容。有些配置允许在后台验证期间先返回旧内容，或在源站异常时短期使用旧内容，但这不是所有响应的默认保证。

浏览器到边缘与边缘到源站是两段连接，TLS 和 HTTP 版本可以不同。HTTPS 不妨碍 CDN 缓存，因为边缘通常就是客户端 TLS 的终点。动态请求即使不缓存，也可经过边缘做连接管理、防护与转发；多走一个中间节点是否提速，需要结合真实路径测量。

CDN 不是发布时自动将所有文件复制到每个节点。很多缓存是按请求填充的，还可能提前淘汰；TTL 是新鲜度规则，不是保证文件驻留的时间。分层缓存、请求合并与预热可降低冷缓存回源压力，具体能力由产品决定。

## 缓存键回答“这两次请求能共用内容吗”

缓存键通常基于 URL，并可包含或忽略部分查询参数、字段等信息。假设图片接口按参数返回缩略图：

```text
/image?id=42&width=200
/image?id=42&width=1200
```

如果缓存规则忽略 `width`，就可能把小图给需要大图的人。反过来，把无关的追踪参数也纳入缓存键，又会让同一内容出现很多缓存副本，降低命中率。

按 Cookie、语言、地区或认证状态生成不同内容时，更需要确认区分方式。HTTP 的 `Vary` 表达选择维度，但 CDN 对不同字段的支持与自定义缓存规则要查产品文档，不能假设自动处理所有情况。用户账户页、订单和带权限的下载，不应因为“缓存一切”规则混入公共缓存。

## 浏览器缓存与边缘缓存分别控制

下面是公开内容的示意响应字段：

```http
Cache-Control: public, max-age=60, s-maxage=600
ETag: "article-rev-12"
```

浏览器依据 `max-age` 判断新鲜度，共享缓存可依据 `s-maxage` 使用更长时间；CDN 配置还可能覆盖这些值。因此“源站已更新”“CDN 已更新”“用户浏览器已更新”是三个不同状态。缓存基础语义见 [HTTP](../http/http.md)，浏览器侧见 [HTTP 缓存](../../browser/cache/http-cache.md)。

Cloudflare 的代理开关不等于所有响应都会缓存，例如其默认策略不会缓存 HTML 和 JSON；需要结合响应字段、文件类型和 Cache Rules 判断。[默认缓存行为](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)说明的是产品默认值，不能替代你实际部署的规则。

## 一次发布怎样避免 HTML 与脚本错配

稳定 URL 覆盖更新最容易出现混用：新的 HTML 引用新的接口约定，浏览器却从缓存拿到旧脚本。更常见的发布策略是给内容文件使用 hash，给入口文件保持可更新性：

```text
Release A: index.html → /assets/app.a81c9e.js
Release B: index.html → /assets/app.b72d10.js
```

带 hash 的资源在内容改变后换 URL，可设置长时间缓存：

```http
Cache-Control: public, max-age=31536000, immutable
```

HTML 作为“这一版依赖哪些资源”的入口，可以用 `no-cache` 让后续使用先验证，或使用适合业务的短新鲜期。`no-cache` 允许保存，不是禁止缓存。上面的长缓存只适合保证同 URL 不再改内容的资源，不能照搬给 `/app.js`。

发布顺序也重要：先上传新资源，再切换 HTML/manifest 等入口。旧资源应保留一段时间，因为旧标签页、旧缓存入口和延迟加载仍可能引用它们。回滚通常可以重新指向上一版入口，但客户端和边缘各层缓存仍会影响观察。

给 URL 加 `?v=2` 也能换地址，前提是 CDN 缓存键没有忽略该参数。hash 文件名让版本与内容直接关联，更容易检查；它不会自动解决 HTML 自身长期缓存的问题。

## purge、过期、验证和版本 URL 有什么不同

自然过期让缓存到期后再判断；条件验证减少未变化内容的重复传输；版本 URL 让新内容使用新键；purge 主动使供应商缓存中的旧条目失效。它们可以配合，不是互斥方案。

紧急改错或撤下公开内容时，可按 URL、标签等产品支持范围 purge；清空全部缓存容易引发大量回源。Cloudflare 提供的刷新方式与限制见 [Purge cache](https://developers.cloudflare.com/cache/how-to/purge-cache/)。实际操作还需覆盖自定义缓存键变体。

CDN purge 不能直接删除已经存进用户浏览器、Service Worker 或其他代理的副本。删除源文件也不保证已缓存副本立即消失。因此需在设计阶段确定入口 TTL、版本路径和紧急撤回策略，不能把刷新按钮当作全网同步广播。

## 怎样确认优化发生在哪一段

```bash
curl -sS -D - -o /dev/null https://static.example.com/assets/app.a81c9e.js
```

这是查询片段，域名需替换。看 `Cache-Control`、`Age` 和供应商缓存状态字段；Cloudflare 常见 `CF-Cache-Status`。一次 MISS 可能是冷节点，HIT 也不代表整个页面快，因为接口、图片体积、JS 执行可能仍是瓶颈。

除了请求命中率，还要看字节命中率、回源流量、首字节时间和实际页面指标；大量小文件命中掩盖不了大视频持续回源。减少无用资源、合理压缩与图片尺寸、避免关键请求串行，也往往比盲目切换协议更有效。排障入口见 [诊断命令](../diagnostics-interview/diagnostics.md)。

资料：[RFC 9111（HTTP 缓存）](https://www.rfc-editor.org/rfc/rfc9111)、[RFC 8246（immutable）](https://www.rfc-editor.org/rfc/rfc8246)、[Cloudflare 缓存键](https://developers.cloudflare.com/cache/how-to/cache-keys/)。继续阅读 [Cloudflare 流量路径](cloudflare.md)与 [unpkg 和 npm](unpkg.md)。
