# JWT：一段声明怎样变成可验证凭据

JWT 通常由 `header.payload.signature` 三段 base64url 编码组成。编码不是加密：任何持有者都能读未加密 payload。签名证明内容未被未经授权地改动，并把 token 绑定到可信签发者；它不说明 token 的使用者就是某个真人。JWT 可用作 ID token 或 access token，但具体验证规则取决于协议和受众。

```json
{
  "iss": "https://id.example",
  "sub": "user-42",
  "aud": "web-client",
  "exp": 1900000000,
  "iat": 1899996400
}
```

`iss` 是签发者，`sub` 是主体，`aud` 是预期接收者，`exp` 是过期时间。验证方要固定允许的算法、选择可信密钥、验证签名、发行者、受众、时间和应用所需的 scope/权限；不能无条件相信 header 里的 `alg`、`kid` 或 `jku` 指向任意密钥。JWKS 轮换需处理缓存、未知 key ID 与旧 token 的重叠有效期。

签名 JWT 的优点是资源服务器可离线验证；代价是撤销和权限变化不一定即时生效。短有效期、版本号、撤销列表或 introspection 是不同取舍。敏感数据不要放入可读 payload；JWE 才是加密容器，但复杂度也提高。避免把 JWT 放 URL 中，以免进历史、日志、Referer。

资料：[RFC 7519（JWT）](https://www.rfc-editor.org/rfc/rfc7519)、[RFC 8725（JWT 安全最佳实践）](https://www.rfc-editor.org/rfc/rfc8725)。
