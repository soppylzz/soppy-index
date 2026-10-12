# Scope、Audience 与逐资源授权

## 1. 三种约束不要互换

`scope` 表示客户端被授予的操作范围，例如 `read:profile`；`aud` 指 token 的预期接收者；业务角色或资源 ACL 决定某个主体能否对具体对象做操作。一个 token 有 `write:document` scope，仍不意味着持有者能修改任意人的文档。资源服务器要同时核对令牌有效、受众正确、scope 足够，以及用户对该资源的权限。

```text
access token: sub=user-42, aud=documents-api, scope=write:document
PUT /documents/7 → 验证 token → 查文档 7 的 owner/成员关系 → 决定可否写入
```

前端路由守卫、按钮禁用和隐藏管理菜单只能改善交互。只在前端检查 `role === "admin"`，服务端仍接受普通用户请求，就是越权漏洞。ID token 的受众通常是客户端，不能把它发给资源服务器充当 access token。

## 2. 最小权限与权限变化

请求尽量少的 scope；服务端不要把高权限 token 交给不需要它的页面或第三方脚本。角色变更后，服务端 session 可下次查询时立即反映；离线验证的 JWT 可能直到过期才体现变化，需短有效期、版本检查、撤销或 introspection。授权决策最好按操作与资源记录，而非仅按用户登录态。

## 3. 第三方登录与本地账号

第三方登录得到的是“这个 IdP 在其命名空间中识别了某个 subject”。本地账号绑定要用 `(issuer, sub)` 作为稳定外部标识，并由已登录用户明确确认；不要只凭同名邮箱自动合并两个账号。邮箱可能未验证、变化或被重新分配。首次登录的创建/绑定流程要防并发重复和恶意抢绑。

不同 IdP 的 `sub` 不能直接比较。用户取消授权、IdP 不可用、token 过期时，应把外部认证错误与本地会话状态分开处理。社交登录完成后，本应用通常仍建立自己的 session，以便独立管理权限和退出。

资料：[OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0.html)、[RFC 9068（JWT Access Token Profile）](https://www.rfc-editor.org/rfc/rfc9068)、[OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)。
