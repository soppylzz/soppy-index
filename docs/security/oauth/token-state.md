# 令牌状态：验签通过以后，怎样知道它已被撤销

管理员禁用了一个账号，旧 JWT 的签名却仍然正确。这不是验签出错：签名证明签发内容没有被篡改，不代表签发后的授权状态一直没变。

## Introspection 查询当前状态

资源服务器可以向授权服务器的受保护 introspection endpoint 查询 token，响应以 `active` 表示是否处于可接受状态，并可包含 scope、sub、aud、exp、client_id 等。查询端点本身需要访问授权，不能成为任意调用者探测 token 的公开接口。

`active=true` 仍不等于允许所有业务动作：API 还要检查适用的受众、scope 与资源权限。不透明 token 常用在线查询解释状态，JWT 也可结合此查询，不存在“JWT 只能离线验证”的限制。

如果把 active 结果缓存 60 秒，撤销传播就可能多出最多约一个缓存周期的窗口。每次查询状态更及时，但增加延迟和对授权服务的依赖；查询故障时应按业务风险拒绝或使用明确受限的缓存策略，不能静默当作有效。

## Revocation 请求停止接受凭据

客户端可向授权服务器的 revocation endpoint 提交 token，服务器按凭据类型与授权关系处理撤销。撤销 refresh token 可同时影响相应 access token 或授权链，具体范围需依协议和服务策略确认。

撤销接口对无效 token 也可返回成功，所以成功响应不是“这个 token 原来有效”的证明。离线验证方若不查询撤销状态，仍可能接受未到期 JWT；短有效期、在线版本检查和状态查询决定实际停止接受的时间。

面试比较时，应说明三件事：状态由谁维护、验证方何时读取、缓存允许多长延迟。短期 access token 配合可撤销 refresh token 是一种取舍，不是瞬时全局撤销的保证。本地实验只实现会话撤销，没有实现这两个标准端点。

参考：[RFC 7662：Introspection](https://www.rfc-editor.org/rfc/rfc7662.html)、[RFC 7009：Revocation](https://www.rfc-editor.org/rfc/rfc7009.html)。
