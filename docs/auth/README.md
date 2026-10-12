# Auth：从登录到授权

登录不是一个表单，而是一条跨越浏览器、应用服务、身份提供方和资源服务的信任链。先学本地会话，再学 OAuth/OIDC。配套的 [Next.js SSR 登录实验](demo/README.md)可观察登录、受保护页面、会话 Cookie、CSRF 防护和退出流程；它使用框架而不是原生 Node HTTP server。

| 顺序 | 主题                                         | 学习目标                                        |
| ---- | -------------------------------------------- | ----------------------------------------------- |
| 1    | [认证、授权和会话](session.md)               | 区分身份、权限、Cookie、session、access token   |
| 2    | [OAuth 2.0 与 OIDC](oauth-oidc.md)           | 授权码、PKCE、state、nonce、ID token 各负责什么 |
| 3    | [浏览器架构与令牌生命周期](browser-flows.md) | BFF、SPA、刷新、登出、跨站 Cookie 的取舍        |
| 4    | [JWT 与验证](jwt.md)                         | 签名、声明、密钥、算法混淆与适用边界            |
| 5    | [安全与面试推演](security.md)                | 登录 CSRF、开放跳转、会话固定、重放和权限检查   |
| 6    | [Next.js 登录实验](demo/README.md)           | 在真实 SSR 页面和 Route Handler 中观察边界      |

补充阅读：[Scope、Audience 与逐资源授权](authorization.md)把令牌权限与业务资源权限分开，并说明第三方账号绑定。

学习时先画清四种角色：资源所有者、客户端、授权服务器、资源服务器。业务应用可能兼任多个角色，但概念不能混同。OAuth 主要是委托授权；需要标准化“用户是谁”时再引入 OIDC。安全原则与网络链路可结合 [Security](../security/README.md)、[Network](../network/README.md) 复习。
