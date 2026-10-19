# 浏览器登录架构：谁持有凭据，谁负责失效

同样是“前端调用 API”，有的系统只给浏览器 Cookie，有的把 access token 交给 JavaScript。选择应从请求路径和威胁出发：谁需要访问资源服务器，凭据会暴露给哪些代码，退出后又由谁拒绝旧凭据？

## 凭据存放位置决定请求路径

| 架构 | 浏览器持有 | 访问路径 | 主要成本 |
| --- | --- | --- | --- |
| 本地服务端 Session | 不透明会话 Cookie | 浏览器 → 应用服务 → 会话与业务数据 | 多实例共享状态，Cookie 请求需防 CSRF |
| BFF | BFF 会话 Cookie | 浏览器 → BFF → 携带 OAuth token 调 API | 后端保管 token、管理会话并承担代理流量 |
| Token-mediating Backend | 短期 access token 与后端会话 Cookie | 后端保存 refresh token，浏览器携带 access token 直接调 API | 降低长期凭据暴露，但 access token 仍暴露给前端脚本 |
| 纯 SPA OAuth 客户端 | JavaScript 可使用的 token | 浏览器 → 资源 API | 公开客户端、XSS 暴露面、跨源配置与刷新协调 |

Token-mediating Backend 与 BFF 的区别在于短期 token 是否交给浏览器；不能只看到“有后端”就认为全部 OAuth 凭据都留在服务端。

BFF 是职责划分，不是某个框架特性：OAuth token 留在后端，浏览器通过会话访问它。SSR 框架也不会自动保护所有 API，页面和 Route Handler 必须各自校验入口。

内存存储 token 减少长期落盘，但刷新页面会丢失，活跃 XSS 仍能使用它。localStorage 便于持久化，也使同源脚本能够读取；HttpOnly Cookie 不可直接读取，却仍可能被 XSS 借用发请求。存储选择不能替代 [XSS 防护](../attacks/xss.md)。

## 续期为什么会遇到并发与重试

access token 短期有效，refresh token 用于向授权服务器换新凭据。rotation 让刷新返回新 refresh token 并使旧值失效，从而有机会识别重放。但两个标签页同时使用旧值，或刷新已成功而响应丢失，都可能表现为“旧值再次出现”。

客户端应协调刷新，避免一个过期请求触发一轮独立刷新；服务端需原子消费旧值，并定义重用检测、令牌族撤销和必要的重试策略。不能为消除报错而永久接受所有旧值，否则失去检测意义。刷新失败应按原因处理：网络故障可有限重试，确定失效后再清理登录状态并重新认证。

纯 SPA 属于公开客户端。[RFC 9700 §2.2.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.2.2)要求这类客户端的 refresh token 使用发送方约束或 rotation 以检测重放；不是“用了 PKCE，长期令牌就可以随便保存”。静默 iframe 续登还受第三方 Cookie 与浏览器隐私策略影响，不能作为普遍保证。

## 退出至少涉及两个状态源

应用会话和 IdP 单点登录会话彼此独立。本地退出后再次点击第三方登录，可能因 IdP 仍有会话而迅速登录；这不一定意味着本站退出失败。若产品需要全局退出，应接入提供方支持的登出协议并定义其范围。

清掉本地 token 也不会让所有 API 立刻拒绝已签发 JWT，需结合过期与撤销设计。BroadcastChannel 可通知其他标签页更新 UI，但安全状态以服务端判断为准；一条客户端通知本身不能撤销凭据。

## 部署域名会改变浏览器行为

`app.example.com` 与 `api.example.com` 跨源但可能同站；换到另一个可注册域才可能进入跨站场景。跨源 fetch 涉及 credentials 和 CORS，跨站 Cookie 还涉及 SameSite 与浏览器限制，不能一律通过 `SameSite=None` 解决。

同源 BFF 常可使用 `SameSite=Lax`；确需跨站 Cookie 时通常使用 `SameSite=None; Secure`，但这不保证第三方 Cookie 一定可用。部署方案需要分别考虑跨源响应读取、Cookie 发送条件与 CSRF 防护。

参考：[OWASP OAuth2](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)。
