# 服务端 Web 与 BFF：第三方登录后为什么还要建立 Session

用户在身份提供方完成认证，浏览器返回本站。本站如何认出后续的账户请求？第三方 token 和本站会话承担不同职责：前者用于验证外部身份或调用外部资源，后者关联浏览器对本站的持续访问。

## 浏览器传递 code，后端持有 token

服务端 Web 客户端可以保守客户端凭据，因此属于机密客户端。它生成一次性 state、nonce 和 PKCE verifier，浏览器只带着授权请求跳转。授权服务器认证用户后，把短期 code 返回固定回调地址；后端验证交易关联，再携带 code、verifier 和客户端认证信息兑换 token。

后端验证 ID token 的签名、issuer、audience、时间和 nonce，将可信外部主体映射到本地账号，最后生成自己的会话 Cookie。ID token 不应替代访问资源服务器所需的 access token。若后端还负责用 access token 代理 API，它承担 BFF 职责。

```text
Browser -> Application: start login
Browser -> Identity provider: authenticate and consent
Browser -> Application callback: code + state
Application -> Token endpoint: code + verifier + client authentication
Application: validate ID token; bind local subject; create session
Browser -> BFF -> Resource server: session Cookie -> access token
```

这是角色与链路示意。PKCE 与客户端认证可同时存在：前者绑定授权交易，后者证明机密客户端身份，并非重复校验同一个问题。

## 回调与账号映射的边界

state 不能只存在 URL 中，要与发起浏览器安全关联；回调还要处理拒绝授权、过期、缺 code 与重放。最终返回地址应独立限制，不能把任意 `next` 值混进 redirect URI 或开放跳转。

## 第三方账号怎样映射到本地用户

外部身份标识通常用 `(issuer, sub)`：`sub` 只在签发者命名空间内有意义。不能仅凭同名邮箱自动合并账号，邮箱可能未验证、变化或被重新分配。绑定已有本地账号时，应验证用户对相关账号的控制权并明确确认，数据库还需唯一约束防止并发重复绑定。

实验只信任一个固定本地 issuer，将 alice/bob 主体映射到固定演示用户，没有实现任意提供方的账号绑定。第三方认证成功后，本站仍建立自己的会话；外部身份说明“谁完成了认证”，本地角色和资源规则决定“能做什么”。

## BFF 减少什么暴露，又增加什么责任

浏览器不直接持有 OAuth token，降低 token 被前端脚本直接读走的暴露面。但若发生 XSS，攻击者仍可能借当前会话调用 BFF；Cookie 请求也需要 CSRF 防护。后端还承担会话存储、token 续期、代理失败和超时处理。

实验的 BFF 使用 30 分钟本地会话和 5 分钟 access token。后者过期时资源调用会返回错误，本实验没有自动刷新；本地会话仍存在也不意味着外部授权持续有效。退出删除本地会话，不代表已经签发的 JWT 立即失效，更不等于 IdP 与其他客户端全部退出。

## UserInfo 与账号绑定还缺哪些确认

UserInfo 是使用 access token 获取用户声明的受保护端点。它的 sub 必须与已验证 ID token 的 sub 一致后，才能把这些资料用于当前主体；不能拿到一个邮箱就跳过身份验证。资料缓存也不能证明当前授权仍有效。

绑定或解绑应要求近期身份确认，并通知账号原有联系渠道。解绑前确保仍有其他可用登录方式，防止用户失去账号入口。若需要保存第三方 token，只保留调用必要的 scope 与凭据，在后端保护存储并处理撤销；用户只批准部分权限时，相关功能应降级。

## SSO 与三种登出通知

SSO 复用的是 IdP 会话，各应用仍有自己的客户端、token 和本地会话。一个应用退出后，另一个应用继续登录并不必然是漏洞，先明确产品要结束哪一层状态。

| 机制 | 发生的交互 | 主要限制 |
| --- | --- | --- |
| RP-Initiated Logout | 应用请求 IdP 结束登录会话 | 登出后跳转需按注册规则校验，不代表所有 token 同时撤销 |
| Front-Channel Logout | IdP 借浏览器加载应用登出地址 | 受第三方 Cookie、加载失败与浏览器策略影响 |
| Back-Channel Logout | IdP 直接向应用发送受保护的登出通知 | 应用需验证 logout token、防重放并定位会话 |

“退出全部设备”还需要服务端维护并撤销相应会话集合。通知 UI、删除本地 Cookie、撤销 refresh token 与拒绝已有 access token 是不同动作，不能用一个按钮文案替代这些契约。

参考：[OIDC UserInfo](https://openid.net/specs/openid-connect-core-1_0.html#UserInfo)、[RP-Initiated Logout](https://openid.net/specs/openid-connect-rpinitiated-1_0.html)、[Back-Channel Logout](https://openid.net/specs/openid-connect-backchannel-1_0.html)、[OIDC Authorization Code Flow](https://openid.net/specs/openid-connect-core-1_0.html#CodeFlowAuth)、[RFC 9700](https://www.rfc-editor.org/rfc/rfc9700.html)。
