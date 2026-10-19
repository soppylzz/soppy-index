# Discovery 与密钥轮换：验签公钥从哪里来

token header 带有 `kid`，但它只是密钥标识，不能回答“这把钥匙是否可信”。验证方必须先信任一个 issuer，再从配置或该 issuer 的可信元数据获得密钥位置。

## 发现配置不等于发现信任

OIDC Discovery 通常通过 issuer 对应的 `/.well-known/openid-configuration` 提供 `issuer`、`authorization_endpoint`、`token_endpoint`、`jwks_uri` 和支持算法。客户端检查返回的 issuer 与预期精确一致，再使用其端点。不能让登录请求中的任意 URL 决定去哪里下载配置，否则可能信任攻击者的身份服务，甚至让后端发起 SSRF。

JWKS 是 JSON 公钥集合。`kty` 表示密钥类型，`kid` 帮助选择候选 key，`use`、`key_ops` 和 `alg` 等字段描述用途或约束；验证方仍需检查兼容性并固定算法策略，不能仅找到同名 kid 就接受。不要跟随未经信任的 `jku`、`x5u` 地址取钥。

## 为什么不能换钥后马上删旧公钥

正常轮换可先发布新公钥，再使用新私钥签发；旧公钥保留到旧 token 全部过期并留出时钟、缓存余量后再移除。这样不同验证方更新缓存的时间虽不同，仍能验证有效 token。

例如旧 token 还剩 5 分钟有效期，提供方立即删除旧 key，就可能让正常用户突然全部验签失败。相反，密钥已泄漏时属于应急处置，可能需要立即停用并接受用户重新认证的影响。

验证方按缓存策略更新 JWKS；未知 kid 可以触发受控刷新，但要限频并避免大量并发刷新。刷新失败不允许跳过验签，也不能让每个随机 kid 都触发无限远程请求。

本地实验固定 JWKS 地址、单 issuer 与单 key，没有实现 Discovery 或轮换。理解流程时可观察代码如何固定密钥来源，但不能把开发重启生成新钥当成完整轮换。

参考：[OIDC Discovery](https://openid.net/specs/openid-connect-discovery-1_0.html)、[RFC 7517](https://www.rfc-editor.org/rfc/rfc7517)。
