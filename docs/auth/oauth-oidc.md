# OAuth 2.0 与 OpenID Connect

## 1. 先分清授权与登录

OAuth 允许客户端在资源所有者同意后访问受保护资源；它本身不定义完整的“登录用户是谁”的标准断言。OIDC 在 OAuth 之上提供身份层，定义 ID token、UserInfo 等。access token 给资源服务器，ID token 给客户端验证身份；把 access token 当作 ID token 使用会混淆受众与用途。

## 2. 授权码 + PKCE 的因果链

```text
客户端生成随机 state、code_verifier；计算 S256(code_verifier) = code_challenge
浏览器 → 授权端点：client_id、redirect_uri、scope、state、code_challenge
用户在授权服务器认证并授权
浏览器 ← 回调：code、state
客户端核对 state，再把 code + code_verifier 送到 token 端点
授权服务器校验一次性 code、redirect_uri、PKCE → 返回 token
```

`state` 绑定本次浏览器发起的流程，防回调 CSRF/串号；PKCE 防授权码被截获后由不持有 verifier 的一方兑换。二者关注点不同，按当前安全最佳实践组合使用。redirect URI 应精确注册和匹配，避免授权码流向开放跳转。授权码短期、一次性使用，token 端点由后端或受信任组件调用时还应按客户端类型处理认证。

OIDC 在请求中包含 `openid` scope；客户端验证 ID token 的签名、`iss`、`aud`、有效期，并核对与本次请求关联的 `nonce`（若使用），不能只做 base64 解码。用户标识通常使用发行者与 `sub` 的组合，邮箱可能变化且不一定经过验证。多身份提供方场景要防 mix-up，核对授权响应的发行者或使用隔离回调。

## 3. 常见扩展

- Discovery 文档帮助客户端得到端点与能力，JWKS 提供验签公钥；来源仍需预先信任，不能由任意请求参数决定。
- Device Authorization Grant 适合输入受限设备：用户在另一设备输入 code，原设备轮询 token 端点；它不是浏览器普通登录的替代。
- Client Credentials 面向机器到机器，不代表某个已登录用户。
- DPoP 等持有证明机制可降低 bearer token 被复制后的滥用，但增加密钥管理与服务端验证成本。

隐式流程把 token 直接经前端通道返回，安全最佳实践更推荐授权码 + PKCE。不要用过时的“OAuth 四种模式都应平等掌握并任选其一”回答现代浏览器登录设计。

资料：[RFC 6749（OAuth 2.0）](https://www.rfc-editor.org/rfc/rfc6749)、[RFC 7636（PKCE）](https://www.rfc-editor.org/rfc/rfc7636)、[RFC 9700（OAuth 安全最佳实践）](https://www.rfc-editor.org/rfc/rfc9700)、[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)。
