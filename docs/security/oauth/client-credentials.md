# Client Credentials：没有用户参与时，服务代表谁

定时任务需要读取待处理作业，却没有用户坐在浏览器前点击登录。此时调用方通常以自己的客户端身份访问资源，而不是伪装成某个管理员用户。Client Credentials 用于这类机密客户端自身的授权。

## 凭据、令牌和业务操作分别归谁

服务向 token 端点完成客户端认证，并请求约定 scope。授权服务器按预配置策略签发 access token，资源服务器验证其签发者、接收方、有效期与权限，再决定是否接受作业请求。

```text
Worker -> Token endpoint: client authentication + grant_type=client_credentials
Token endpoint -> Worker: access token
Worker -> Jobs API: Authorization: Bearer ...
Jobs API: validate token; authorize the service principal
```

这条路径没有用户授权页面，也没有浏览器回调；通常不需要 state、nonce 或 PKCE。Client Credentials 不应被描述为“用户静默登录”，也不会因为系统用了 OAuth 就必然得到 ID token。

## scope 不能突破服务自身的授权范围

服务申请 `jobs:read` 不代表可以自行得到任意权限，授权服务器必须核对注册配置。资源服务器仍要区分服务主体和用户主体：后台索引任务能读作业，不意味着能通过用户文档接口读取所有隐私内容。

实验的 service 客户端只能申请 `jobs:read`，其 token 不能读取用户文档。Web 页面上的按钮只是本地教学触发器，服务端保存凭据并调用提供方，不把 client secret 或原始 token 返回给浏览器。生产系统中，触发高权限后端任务的入口本身还必须鉴权授权，不能因 token 藏在后端就公开暴露调用能力。

## 长期客户端凭据怎样管理

静态 secret 应留在服务端秘密管理体系，限制权限并定期轮换；私钥签名或 mTLS 等客户端认证方式可用于不同部署要求。认证方式与授权类型是两个维度，不能把 `private_key_jwt` 当成另一种用户登录流程。

访问 token 过期后，服务通常重新用自身凭据获取，不需要用户刷新会话。多个实例应避免在同一时刻重复获取或无限重试，并且不能因为 token 端点故障就绕过资源服务验证。

参考：[RFC 6749 §4.4](https://www.rfc-editor.org/rfc/rfc6749.html#section-4.4)、[RFC 9700：客户端认证](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.5)。
