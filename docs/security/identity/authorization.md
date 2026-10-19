# 授权：登录成功为什么仍不能修改这份文档

用户 A 登录后，把请求里的文档 ID 从自己的 7 改成别人的 8。如果接口只检查“是否登录”，就会把有效身份误当作任意资源的通行证。授权必须同时关联主体、动作和具体资源。

## 沿一次写入检查权限

```text
PUT /documents/8
-> authenticate subject
-> validate token audience and required scope
-> load document within the subject's tenant
-> check membership, role and document policy
-> update permitted fields
```

这是检查顺序示意，不限定实现方式。查询中直接加入租户和成员条件，也可以实现资源约束。用户身份应来自可信会话或已验证 token，不能来自请求体中的 `userId`；文档 ID 只是待检查的输入。

| 约束 | 回答的问题 | 为什么不能单独放行 |
| --- | --- | --- |
| `aud` | 这份 token 是签给哪个接收方的 | 签给邮件 API 的 token 不该被文档 API 接受 |
| `scope` | 客户端获准请求哪些操作 | `write:document` 不意味着能写所有人的文档 |
| 角色、成员关系、ACL | 主体能否对这个对象执行动作 | 成员关系还可能受租户、文档状态和操作类型限制 |

scope 的具体含义由系统定义，不能假定所有提供方使用同一套权限模型。ID token 的接收方通常是登录客户端，不能用它替代发给资源服务器的 access token。

## 角色与属性如何参与决策

RBAC 按角色组织权限，例如编辑者可以编辑文档；ABAC 把用户、资源、动作和环境属性纳入策略，例如“同一租户的成员只能修改未归档文档”。两者可组合，并非必须二选一。仅判断 `role === "editor"` 会遗漏租户、对象关系和文档状态，因此资源检查不能被一个全局角色替代。

水平越权是普通用户操作另一个用户的同类资源；垂直越权是普通用户执行管理员等更高权限动作。无论哪一类，都应默认拒绝未明确允许的操作，并限制可写字段，避免请求体中的 ownerId、role 等字段绕过对象级判断。

## 检查必须覆盖每个入口

隐藏编辑按钮可以避免用户误操作，却挡不住直接请求 API。SSR 页面、下载接口、批量操作、后台任务入口都应按自身契约执行授权；不能因为用户曾打开过受保护页面，就信任后续请求。

批量删除也不能只检查第一条资源。若先检查权限再执行写入，而成员关系或资源状态在中间变化，还要根据业务要求通过事务、条件更新等手段维护决策与写入的一致性。授权不是一次登录时算好的永久布尔值。

权限变更能否立即生效取决于读取路径。Session 若每次查最新权限可以较快反映变化，但缓存角色也会过时；JWT 若携带角色并只做离线验证，通常要等过期，或增加版本检查、撤销查询、introspection。后者也重新引入在线状态依赖。

## 在实验中区分身份与权限

登录 Alice 后访问 `/api/documents/1` 应成功，访问 Bob 的 `/api/documents/2` 应得到 403；退出后两个 API 都应得到 401。[文档处理器](../demo/app/api/documents/[id]/route.ts)从会话读取 userId，再与文档 ownerId 比较，不接受前端提交的主体身份。这里展示只读、所有者授权，不包含成员邀请与事务写入。

## 申请的 scope 不一定全部获批

授权服务器可能只批准请求范围的一部分，客户端应按实际授予范围启用功能，而不是按自己提交过的 scope 显示全部能力。增量授权是在用户真正使用某项功能时再申请额外权限，减少初次授权的负担。

scope 过粗会扩大泄漏影响，过细则增加授权交互与管理成本。多个资源服务也不应为了方便共用无限范围 token，应根据实际 audience 与操作范围限制访问。

参考：[OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)、[OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html)。
