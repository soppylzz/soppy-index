# OAuth 进阶保护：为什么有了 TLS 和 PKCE 还会增加扩展

TLS 保护连接，PKCE 绑定授权码兑换，但它们不解决所有问题：长期 bearer token 被复制后仍可能被使用，浏览器前通道中的授权参数也需要更严格保护。这些扩展适合在掌握基本授权码流程后理解。

## DPoP 与 mTLS：让 token 还需要密钥持有证明

bearer token 的核心风险是“拿到就可能使用”。发送方约束 token 则关联一把密钥，资源服务器除了验证 token，还要求请求方证明持有对应私钥。

DPoP 使用应用层签名 proof。`htm`、`htu` 关联 HTTP 方法与目标，`iat`、`jti` 帮助判断新鲜性与重放；访问资源时的 `ath` 关联 access token。服务器验证 proof 签名、绑定密钥、目标与时间等条件，必要时使用 DPoP nonce，再结合重放检测。

仅有时间戳不足以防止窗口内重放；仅验证 proof 签名而不核对目标和 token 绑定也不完整。若 XSS 已能调用客户端私钥签名，DPoP 仍不能恢复执行环境的信任。

mTLS-bound token 关联客户端证书，通过 TLS 客户端认证证明持有密钥，适合具备证书管理能力的服务；它与“用 mTLS 认证 token 端点的客户端”有关联但不是同一项保证，需要提供方与资源服务器共同支持绑定。

参考：[RFC 9449：DPoP](https://www.rfc-editor.org/rfc/rfc9449.html)、[RFC 8705：mTLS](https://www.rfc-editor.org/rfc/rfc8705.html)。

## PAR、JAR、JARM：分别保护请求提交、内容和响应

| 扩展 | 机制 | 解决的边界 |
| --- | --- | --- |
| PAR | 客户端经后通道提交授权参数，浏览器携带短期 request_uri 引用 | 减少前通道参数暴露，授权服务器可提前校验请求 |
| JAR | 授权请求使用受保护的 JWT 表达 | 验证参数来源和完整性，按配置提供机密性 |
| JARM | 授权响应使用受保护的 JWT 表达 | 验证 code、state 等返回数据的保护与来源 |

这些机制可以组合，仍要校验 issuer、audience、时间、交易关联，并遵守适用 profile 的 PKCE 与回调规则。把参数装进 JWT，本身不是完成了安全验证。FAPI 等高保证 profile 进一步规定扩展组合与算法约束，普通应用无需为了缩写齐全而全部接入。

本地 demo 没有实现这些扩展；面试中先说清新增威胁，再解释扩展保护哪段数据即可。

参考：[RFC 9126：PAR](https://www.rfc-editor.org/rfc/rfc9126.html)、[RFC 9101：JAR](https://www.rfc-editor.org/rfc/rfc9101.html)、[JARM](https://openid.net/specs/oauth-v2-jarm-final.html)。
