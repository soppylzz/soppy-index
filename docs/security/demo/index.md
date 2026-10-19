# 实验走查：从会话走到四类 OAuth 场景

先判断请求将带什么凭据、由谁验证，再操作页面。以下表格列的是预期；浏览器 Cookie、CORS 和存储行为需要在实际浏览器中查看 Network 与存储面板，不能只凭命令行请求判断。

## 本地登录与资源权限

账户页由 Server Component 查询会话后渲染，文档 API 则独立查询会话与所有者关系。页面能打开不能证明所有 API 都可以放行。

| 操作 | 预期 | 要解释的机制 |
| --- | --- | --- |
| 未登录访问 `/api/me`、`/api/documents/1` | 401 | 尚无可接受的身份凭据 |
| 登录 Alice，查看 `/api/documents/1` | 200，返回 Alice 的文档 | 会话标识关联服务端主体 |
| 同一会话访问 `/api/documents/2` | 403 | 身份有效但资源不属于当前用户 |
| 记录旧 Cookie，再登录或退出 | 旧 Cookie 不再可用 | 服务端撤销会话，而非只删除浏览器副本 |
| 修改退出表单隐藏字段 csrf 后提交 | 403，会话未被撤销 | token 与当前会话绑定 |
| 用另一个 Origin 发登录或退出 POST | 403 | 精确校验请求来源 |

Cookie 为 HttpOnly、SameSite=Lax、Path=/；本机 HTTP 环境未设置 Secure，不使用要求 Secure 的 `__Host-` 名称。查看 Cookie 是否存在与脚本能否读取是两回事。两个本地端口跨源但同站，不能用它们单独证明跨站 SameSite 阻断；真实跨站 Cookie 对照由浏览器目录的既有实验维护。

核心实现：[会话](lib/auth.ts)、[资源接口](app/api/documents/[id]/route.ts)、[退出](app/api/logout/route.ts)。用户 ID 从会话取得，输入中的文档 ID 只负责定位待检查对象。

## 服务端 Web/BFF：后端兑换并保管 token

打开 `/oauth`，点击 Start OIDC + PKCE，在提供方页面选择 Alice 或 Bob 并输入演示密码。批准后，浏览器应回到账户页，认证来源显示 oidc；点击资源代理可看到该用户自己的文档。

Network 中浏览器能看到授权请求与 code 回调，但 token 兑换、ID token 验证及 BFF 到资源服务的请求发生在后端。浏览器最终获得的是本站会话 Cookie。仅在浏览器面板没看到请求，不等于后台没有发生调用。

重复访问已完成回调、伪造 state 或使用错误 issuer 应被拒绝；用户拒绝授权也不应建立新会话。实验通过服务端交易状态与 HttpOnly Cookie 关联浏览器，消费交易后不再接受相同回调。

核心实现：[开始交易](app/api/oauth/start/route.ts)、[回调](app/api/oauth/callback/route.ts)、[ID token 验证](lib/oauth-client.ts)。验证函数固定可信 JWKS 地址与 RS256，校验 issuer、audience、时间与 nonce；不根据 token 提供的任意 URL 取密钥。

## SPA：浏览器兑换并持有 token

打开 `/oauth/spa`，点击 Start authorization，完成提供方认证后返回，点击 Complete callback。成功后显示已验证主体；点击 Read own documents 应只返回自己的文档。

交易 state、nonce、verifier 暂存 sessionStorage，access token 保存在组件内存。刷新页面后内存 token 消失；清除本地引用也不等于服务器撤销 token。不要把这些存储选择解释为能抵抗同源 XSS。

兑换不携带 client secret；错误 verifier 与已消费 code 应被拒绝。浏览器向资源服务发送 Authorization 头时会涉及 CORS 预检，提供方只允许精确的应用 Origin 读取响应。手工请求得到同样 JSON 不代表浏览器 CORS 已验证。

核心实现：[SPA 页面](app/oauth/spa/page.tsx)、[token 端点](app/provider/token/route.ts)、[资源服务](app/provider/resource/route.ts)。手动完成按钮让交易步骤可见，也避免开发环境重复副作用意外消费一次性 code。

## Client Credentials：服务自身访问作业

在 `/oauth` 点击 Run Client Credentials request，预期返回 service 主体及作业列表，不返回用户身份断言或原始 token。服务端向提供方请求 `jobs:read`，再携带 token 读取作业；客户端认证信息不进入前端代码。

该服务 token 请求用户文档应得到 403；Alice 的文档 token 请求作业也应被拒绝。scope 与服务主体共同约束可用能力，不能将服务权限默认扩展成任意用户权限。

核心实现：[服务调用入口](app/api/oauth/service/route.ts)。按钮对应的入口是本地公开教学触发器；正式应用必须另外授权谁可以触发服务操作。

## Device Authorization：认证页面与设备分离

打开 `/oauth/device`，申请 device code；页面只展示 user code 和验证地址。等待至少显示的轮询间隔再点击 Poll token endpoint，此时未批准应得到 authorization_pending。

在另一标签页打开验证页面，输入 user code、演示账号和密码并批准。按间隔再次轮询，设备应得到 access token，并能读取批准用户的文档。成功后停止轮询；过早轮询会得到 slow_down，需按更长间隔等待。拒绝后停止交易，过期后需要重新申请。

这个浏览器页面只扮演设备角色，没有把设备码授权伪装成原生 CLI。它得到的是资源 access token，没有 ID token；“可以访问用户授权资源”与“已建立本站登录会话”仍是两个判断。

核心实现：[设备页面](app/oauth/device/page.tsx)、[设备授权请求](app/provider/device/route.ts)、[用户批准](app/provider/verify/route.ts)、[轮询处理](app/provider/token/route.ts)。

## 到期、重启与未实现的行为

access token 有效期 5 分钟，本地会话 30 分钟，授权交易和设备交易 5 分钟，授权码 1 分钟。提供方重启后随机签名密钥变化、未完成 code 与设备交易丢失；应用重启后本地会话丢失。开发热更新保留部分 globalThis 状态只是本实现细节，不能当作持久化保证。

未实现 refresh token、rotation、多设备全局退出、真实身份提供方互通、XSS 攻击页或生产级风控。文档对这些机制的讨论不是实验能力声明。
