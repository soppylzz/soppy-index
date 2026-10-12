# 浏览器登录架构与令牌生命周期

## 1. 三种常见架构

| 架构                        | 浏览器持有          | 后端职责                             | 适用与代价                                     |
| --------------------------- | ------------------- | ------------------------------------ | ---------------------------------------------- |
| 服务端 Session              | 不透明 Cookie       | 验证登录、存会话、逐请求授权         | 同源 Web 应用简单；多实例要共享存储            |
| BFF（Backend for Frontend） | BFF 会话 Cookie     | 后端持有 OAuth token，代理受保护 API | 减少浏览器暴露 token；增加服务端状态和代理成本 |
| 纯 SPA OAuth 客户端         | 浏览器端 token/状态 | API 验证 token                       | 必须精心处理 PKCE、存储、续期、XSS 与跨源      |

SSR 框架不自动等于安全：Server Component 中做的权限判断必须与 Route Handler/API 的权限判断一致。浏览器存储选择无法完全抵御 XSS；BFF 能减少直接暴露 token 的位置，但 XSS 仍可能用当前会话请求接口。

## 2. 续期与退出

短期 access token 到期后，客户端可以重新授权或用 refresh token 换新 token。refresh token rotation 每次使用返回新令牌并让旧令牌失效，可帮助检测重放；网络重试、并发标签页、服务端原子更新都要设计。刷新失败时清理本地会话并引导重新登录，不应无限循环。静默 iframe 登录受第三方 Cookie 限制，不能假定处处可用。

登出至少包含本应用会话撤销；如果有外部身份提供方，还可能要处理 IdP 单点登录会话和其他客户端会话。前端删 token 不等于资源服务器立即不再接受已发出的 JWT；需考虑短有效期、撤销列表或 introspection。多标签页可通过 BroadcastChannel 通知 UI 更新，但安全状态以服务端为准。

## 3. Cookie 与跨站部署

同源 BFF 可用 `SameSite=Lax` 等 Cookie 策略；跨站嵌入或 API 部署可能需要 `SameSite=None; Secure`，还要考虑浏览器对第三方 Cookie 的限制。CORS 只决定脚本能否读响应，不能代替认证或 CSRF。登录回调跳转到哪里应使用固定路径或严格允许列表，避免泄漏 code 和 token。

资料：[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700)、[OWASP OAuth2 Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/OAuth2_Cheat_Sheet.html)、[OWASP CSRF Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)。
