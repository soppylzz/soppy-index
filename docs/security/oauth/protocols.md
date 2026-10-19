# OAuth 与 OIDC：第三方回调为什么值得信任

“用第三方账号登录”时，用户在身份提供方输入凭据，本站收到的却只是一次浏览器回调。回调参数本身可以伪造，客户端必须把它关联到自己发起的流程，并验证身份断言。

## 先区分委托授权和身份认证

假设日程应用想读取用户在另一服务中的日历。用户是资源所有者，日程应用是客户端，负责认证并发 token 的服务是授权服务器，日历 API 是资源服务器。OAuth 解决委托访问，客户端无需获得用户在日历服务中的密码。

OIDC 在 OAuth 上增加身份层。请求 `openid` scope 后，客户端按协议验证 ID token，得到签发者对用户身份的断言。access token 用来调用资源 API，ID token 用来向客户端说明认证结果；能调用某个 API 并不自动构成本站所需的登录证明。

## 四类场景不是四个同层级协议

| 场景 | 客户端与交互 | token 代表什么 |
| --- | --- | --- |
| 服务端 Web/BFF | 机密客户端，浏览器跳转，后端兑换 code | ID token 向客户端断言用户身份，access token 访问资源 |
| 纯 SPA | 公开客户端，浏览器使用授权码 + PKCE | 同样可以使用 OIDC，但 token 直接由浏览器管理 |
| 服务间调用 | 机密客户端使用 Client Credentials | 服务主体自己的授权，不代表某个登录用户 |
| 输入受限设备 | Device Authorization，用户在另一页面批准 | 设备获得用户批准的资源访问权限 |

OIDC 决定是否有标准化身份断言，PKCE 绑定授权交易，Client Credentials 与 Device Authorization 则是不同授权类型。Web/BFF 同样可以使用 PKCE，SPA 同样可以使用 OIDC。旧资料中的“授权码、隐式、密码、客户端凭据四种模式”需要认识，但不应被当作今天四种同等推荐的登录选项。

## 授权码流程把浏览器跳转与兑换分开

以下为采用 `state`、PKCE 和 OIDC `nonce` 的流程示意，不是实验的网络记录：

```text
Client: create state, nonce and code_verifier; store transaction context
Client: code_challenge = BASE64URL(SHA256(code_verifier))
Browser -> Authorization endpoint: client_id, redirect_uri, scope=openid,
           state, nonce, code_challenge, code_challenge_method=S256
User -> Authorization server: authenticate and consent
Browser -> Client callback: code, state
Client: validate state and the expected issuer; reject callback reuse
Client -> Token endpoint: code, code_verifier, redirect_uri
Authorization server -> Client: access token, ID token
Client: validate ID token and nonce; establish local session
```

授权码短期且一次性使用，浏览器不必直接接收长期访问凭据。授权服务器把 code 关联到客户端、回调地址和 PKCE challenge；兑换时验证 verifier。机密客户端还按约定进行客户端认证；公开 SPA 无法保守写在前端包里的 client secret，不能靠它证明自身身份。

## 三个随机值各绑定什么

| 值                      | 关联的位置                 | 想阻断的错误                           |
| ----------------------- | -------------------------- | -------------------------------------- |
| `state`                 | 发起请求与浏览器回调       | 把外来的回调当成本浏览器发起的流程     |
| PKCE verifier/challenge | 授权请求与 code 兑换       | 截获或注入 code 的人绕过原交易兑换凭据 |
| `nonce`                 | OIDC 请求与已验证 ID token | 把另一认证交易的身份断言接到当前流程   |

这些值必须随交易生成并安全绑定到发起方，验证完成后及时消费，不能只比较“两个参数看起来一样”。`state` 也不应直接承载未经校验的最终跳转 URL，可保存服务器侧交易引用。

[OAuth 安全最佳实践 RFC 9700 §2.1](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.1)允许满足条件的 PKCE 或 OIDC nonce 承担回调 CSRF 防护，并不要求所有实现机械地堆叠三个参数。本篇组合使用它们便于解释各自绑定关系；实现时应使用维护良好的协议库，并验证所依赖的保护前提。

## 兑换成功后仍要验证身份

客户端需要信任预先配置的 issuer 和密钥来源，按 OIDC 规则检查签名、`iss`、`aud`、有效期，以及已发送的 nonce；多受众等情况还涉及 `azp` 等规则。仅解码 payload 就读取 `sub`，等于信任未经验证的输入。具体的验签思路见 [JWT](../identity/jwt.md)。

redirect URI 按协议要求精确注册和匹配，业务返回地址另行约束。支持多个提供方时还要防 mix-up，把响应绑定到预期发行者，例如校验授权响应的 issuer 或使用隔离回调。Discovery 和 JWKS 提供端点与密钥发现，不代表可以信任用户任意指定的地址。

DPoP 等发送方约束机制把 token 的使用关联到密钥持有证明，可降低单独复制 bearer token 后的滥用；它增加密钥与证明验证成本，也不能让已经控制客户端执行环境的 XSS 自动失效。

隐式流程直接经前端通道返回 access token，安全最佳实践不建议用于新的浏览器设计；密码凭据授权也不应继续作为现代登录选项。Client Credentials 代表机器自身，Device Authorization 适合输入受限设备，都不能直接代替普通用户的网页登录。

## OAuth 版本怎样理解

OAuth 1.0 使用请求签名，涉及参数规范化与密钥管理；OAuth 2.0 是不同的授权框架，常用 TLS 与 bearer token，并通过独立扩展补充 PKCE、设备授权、撤销等能力。2.0 不是把 1.0 的签名简单删掉就完成了安全设计。

截至 2026-10-19，OAuth 2.1 的 draft-ietf-oauth-v2-1-16 仍是 Internet-Draft。它整合授权码 + PKCE 等现代实践，并移除隐式和密码凭据授权等旧路径。实施应依据已发布 RFC、RFC 9700 安全 BCP 与适用扩展，不必等待“2.1 正式发布”才修复旧流程。

版本状态来源：[IETF Datatracker](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/)。

参考：[RFC 7636](https://www.rfc-editor.org/rfc/rfc7636)、[OIDC Core 的 ID token 验证规则](https://openid.net/specs/openid-connect-core-1_0.html#IDTokenValidation)。
