# 认证与会话：服务端怎样认出下一次请求

登录成功后打开账户页，浏览器发出的是一个新 HTTP 请求。即使复用了连接，服务端也不能仅凭连接判断用户：同一用户可能换连接，代理还可能复用连接。因此应用需要显式凭据，把请求关联到已认证主体。

## 从密码验证走到会话查询

认证回答“请求方是谁”，会话保存跨请求的关联，授权回答“这个主体能否执行这次操作”。以本地账号登录为例，下面是流程示意：

```text
POST /login -> verify credentials -> create random session ID -> Set-Cookie
GET /account + Cookie -> find session -> load user -> authorize -> respond
POST /logout -> revoke session -> expire Cookie
```

服务端验证密码后生成不可预测的不透明随机值，将其关联到用户、过期时间等状态。浏览器保存 Cookie；后续符合发送条件的请求自动携带它。服务端看到的是会话凭据，不会每次重新验证密码。若把用户 ID 直接当 session ID，攻击者猜出别人的 ID 就可能冒充对方。

会话 ID 通常是 bearer 凭据：持有有效值的一方就可能使用它。`HttpOnly` 降低脚本直接读取的风险，无法让被复制的值失效；Cookie 属性的具体边界见 [Cookie 与 CSRF](../attacks/csrf.md)。

## 会话何时失效，由服务端决定

浏览器删除 Cookie 只删除本地副本。若服务端记录仍有效，另一份被复制的 Cookie 仍可能成功。可靠退出需要先撤销服务端状态，再清 Cookie；过期也必须由服务端检查，不能只依赖浏览器的 `Max-Age`。

登录和权限提升时应轮换会话标识，避免继续沿用攻击者已知的登录前标识。空闲超时限制长期无操作的会话，绝对超时限制会话总寿命；续期不应无条件绕过绝对期限。多设备退出还需要知道用户有哪些会话，不能只删除当前浏览器这一份。

内存 Map 能展示查询与撤销，但重启后状态丢失，多实例间也不共享。共享存储让实例看到同一会话状态，同时引入可用性和一致性成本；不能因查询失败就默认放行。

## 密码与 token 保护的是不同阶段

密码验证发生在建立身份时，应使用适合密码的慢哈希算法与每用户随机 salt，配合限速和安全的重置流程。随机会话 token 熵足够高，存其快速哈希索引与“用单次 SHA-256 存密码”是两回事：密码可被字典猜测，随机 token 的安全前提是不可猜测。

access token 是资源服务器接受的授权凭据，可以是不透明值，也可以采用 JWT。服务端查询式会话便于集中撤销；离线验证的签名 token 减少每次查库，但权限变化和撤销未必即时生效。比较时要问“谁维护状态、何时检查状态”，而不是断言某个格式天然更安全。

[实验的会话模块](../demo/lib/auth.ts)生成随机 token、保存哈希索引并在查询时检查过期；[登录处理器](../demo/app/api/login/route.ts)撤销旧会话后创建新会话。它维护两个固定演示账号、固定 30 分钟有效期，没有实现空闲续期和多设备管理。

参考：[OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)、[Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)。
