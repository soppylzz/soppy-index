# 登录安全与面试推演

## 1. 从攻击前提开始答

| 问题       | 攻击发生条件                           | 主要防线                                                  |
| ---------- | -------------------------------------- | --------------------------------------------------------- |
| 登录 CSRF  | 攻击者让受害者完成攻击者账号的登录流程 | 登录请求的 Origin/CSRF 校验；OAuth 回调 state/PKCE        |
| 会话固定   | 登录前后沿用攻击者可知的会话 ID        | 登录时重建并轮换会话                                      |
| CSRF       | 浏览器自动带 Cookie 执行状态改变       | CSRF token、Origin/Fetch Metadata、SameSite、正确方法语义 |
| XSS        | 不可信内容被页面当作脚本执行           | 安全 DOM API、上下文编码/清理、CSP                        |
| 授权码窃取 | code 被截获或重定向到错误地址          | PKCE、精确 redirect URI、一次性 code                      |
| 越权       | 服务端只信前端传来的 userId/role       | 由已认证主体逐资源判断授权                                |

登录错误信息不宜泄露账号是否存在，密码验证要限制尝试频率；MFA、风险检测、异常设备通知按业务风险配置。密码重置链接应短期、单次使用，并避免泄漏到第三方 Referer。

## 2. 面试题：HttpOnly + SameSite 就够了吗？

不够。HttpOnly 不能阻止 XSS 以当前会话调用同源 API；SameSite 不能覆盖同站子域及所有登录/跨站业务场景；服务端还要验证请求意图和逐请求授权。TLS 保护链路，密码哈希保护服务端凭据存储，三者保护的边界不同。

## 3. 面试题：JWT 能替代 Session 吗？

JWT 是 token 格式，Session 是持续交互的状态模型；它们可组合。要问令牌谁签发、谁验证、存在哪里、如何刷新与撤销、权限变化多久生效。仅说“JWT 无状态所以更安全”是不成立的。用 [Next.js 实验](demo/README.md)先观察不透明 Session 的生命周期，再用 [OAuth/OIDC](oauth-oidc.md)理解跨系统授权。

资料：[OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)、[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700)。
