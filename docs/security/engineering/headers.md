# 安全响应头：每个头负责哪条边界

接口已经校验身份，为什么还要发送 CSP 或 HSTS？因为浏览器还会加载脚本、嵌入页面和发起后续连接。响应头把这些行为限制交给浏览器执行；它们无法替服务端判断某份订单属于谁。

## 先按受保护的边界选择策略

| 头或机制 | 主要作用 | 常见误用 |
| --- | --- | --- |
| `Content-Security-Policy` | 限制页面可执行/加载的资源；`frame-ancestors` 限制谁可嵌入 | 以为白名单能修复所有 XSS；无测试直接上严格策略导致业务脚本失效 |
| `Strict-Transport-Security` | 浏览器记住该站应走 HTTPS | 在未确认所有子域 HTTPS 就加 `includeSubDomains`/预加载 |
| `X-Content-Type-Options: nosniff` | 限制某些资源 MIME 嗅探 | 当作内容校验或下载安全策略 |
| `Referrer-Policy` | 控制导航/请求暴露的 Referer 信息 | 以为它能隐藏 URL 中的全部敏感信息 |
| `Permissions-Policy` | 限制页面或 iframe 可用的浏览器能力 | 误以为替代用户授权或服务端授权 |
| `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` | 控制跨源窗口隔离、资源嵌入策略 | 未评估第三方资源就启用，造成集成失败 |

## 从脚本加载过程理解 CSP

一个简化的策略示意：

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-<per-response-random>'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'
```

策略中的 nonce 是占位值，真实响应还要在允许执行的 script 标签上提供相同 nonce。它表达“该标签由本次响应授权”，所以不能给所有攻击者可控标签统一补 nonce。

nonce 必须每个响应不可预测地生成并匹配受信任的脚本标签；不要把固定 nonce 写进构建产物。实际项目还需明确 `connect-src`、`img-src`、`style-src` 等业务依赖，先用 `Content-Security-Policy-Report-Only` 观察违规，再逐步强制。`frame-ancestors` 限制别人嵌入本页；`frame-src` 管本页嵌入谁，不能互换。旧的 `X-Frame-Options` 可作为兼容性补充。

## HTTPS 与跨源隔离各自改变什么

HSTS 只在可信 HTTPS 响应中生效。尚未记住策略的首次 HTTP 访问，重定向前仍可能暴露于链路攻击；服务端重定向便于迁移但不能消除首次明文请求风险，预加载可在满足条件时减少这一缺口。`Secure` Cookie 约束 Cookie 发送，HSTS 约束浏览器访问站点时使用 HTTPS，两者互补。跨源隔离头适合需要 SharedArrayBuffer 等能力的页面，但启用会影响第三方脚本、iframe 与弹窗关系，要先盘点资源。

## 策略要在最终响应上核对

代理、CDN 和应用都可能设置头，源代码里的配置不等于浏览器最终收到的策略。应在最终文档响应核对 CSP、缓存与 nonce 是否匹配，避免共享缓存把应逐响应生成的 nonce 固定复用。多个强制 CSP 会共同限制行为，不是后一个简单覆盖前一个。`frame-ancestors` 必须通过响应头设置，不能靠 meta 标签实现。

## nonce、hash 与脚本信任传播

nonce 适合动态响应，hash 适合内容固定的脚本：浏览器按脚本内容计算哈希，内容变化就要更新策略。`strict-dynamic` 可把有效 nonce/hash 授权脚本的信任传递给它动态加载的脚本；因此加载器必须审查 URL 来源，不能让它替攻击者加载任意代码。

`default-src` 为适用的资源获取指令提供后备规则，并不替代 frame-ancestors、base-uri 等全部指令。`connect-src` 约束 fetch、WebSocket 等连接。`unsafe-inline`、`unsafe-eval` 会在相应条件下放宽内联或字符串执行限制，不应仅为消除报错而加入。

Report-Only 只报告、不阻断，可配合 Reporting API 的报告端点逐步收紧。报告可能包含敏感 URL，也是不可信输入，接收端应脱敏、限流并防止日志注入；不能把“没收到报告”当成所有浏览器都安全执行了策略。

## CORP、COOP 与 COEP 分别约束谁

CORP 由资源响应声明哪些来源可在相应 no-cors 场景加载它；COOP 约束顶层文档的窗口组关系；COEP 要求文档嵌入的资源满足相应跨源许可条件。它们不是三种拼写不同的 CORS，也不会授予业务权限。

合适的 COOP/COEP 配置可建立 cross-origin isolated 环境，具体状态应检查 crossOriginIsolated。这类隔离有助于降低 Spectre 等旁路读取风险，并支持部分敏感平台能力；第三方图片、脚本和 OAuth 弹窗关系可能因此受影响，要按依赖逐项验证。

敏感个性化响应还要设置适当 Cache-Control 与 Vary，防止共享缓存把用户数据发给其他人。nosniff 不负责资源权限，旧 X-XSS-Protection 也不应作为现代 XSS 主防线。

资料：[CSP Level 3 工作草案](https://www.w3.org/TR/CSP3/)、[RFC 6797（HSTS）](https://www.rfc-editor.org/rfc/rfc6797)、[OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)。
