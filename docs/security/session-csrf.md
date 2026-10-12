# Cookie、会话固定与 CSRF

## 1. Cookie 属性解决不同问题

`Secure` 限制在安全连接上传输；`HttpOnly` 阻止页面脚本直接读取；`SameSite` 控制部分跨站请求附带 Cookie 的情形；`Path`/`Domain` 决定发送范围，不能当作可靠的访问隔离。`__Host-` 前缀要求 Secure、Path=/、无 Domain，可缩小子域覆盖风险。会话 ID 应由服务端生成不可预测随机值，登录或权限提升后轮换，服务端支持过期、撤销与登出。

Cookie 只是凭据载体。即使换成 `Authorization: Bearer`，令牌泄漏、XSS、存储、刷新与撤销仍要处理；无论凭据放哪里，服务端都要逐请求检查授权。

## 2. CSRF 为什么发生

浏览器访问攻击者页面时，可能被诱导向已登录的目标站点提交请求；若浏览器自动附上目标站点的 Cookie，服务端只看 Cookie 就可能误认为是用户有意操作。攻击者通常不需要读到响应。因此 CORS 读取限制本身不能防 CSRF。

```html
<form action="https://bank.example/transfer" method="post">
  <input name="amount" value="100" />
</form>
```

示意表单是否携带 Cookie 取决于 SameSite 等条件；真实防护不能只靠“多数浏览器默认 Lax”。同站的受控子域、旧客户端、业务跨站跳转等都可能改变条件。

## 3. 防护组合

有状态服务通常给会话绑定随机 CSRF token，并要求状态改变的请求从表单隐藏字段或自定义头提交；服务端验证 token、Origin/Referer 或 Fetch Metadata 作为额外信号。`SameSite=Lax/Strict` 降低跨站自动带 Cookie 的机会，不能替代所有场景下的请求意图验证。GET 应避免有副作用；在登录、转账、修改邮箱、退出等流程尤其注意。

```http
Set-Cookie: __Host-session=<opaque>; Path=/; Secure; HttpOnly; SameSite=Lax
```

此为生产 HTTPS 配置示意；`<opaque>` 应是不可猜测的不透明会话标识，而非用户 ID。会话不应出现在 URL；否则易进入历史、日志和 Referer。多设备管理、过期、轮换和撤销要在服务端设计。

## 4. 区分相关攻击

会话固定是攻击者诱导受害者使用已知的会话 ID；登录时轮换 ID 可防护。会话劫持是凭据被盗或复用；TLS、HttpOnly、XSS 防护、设备/风险控制和撤销机制共同降低风险。CSRF 是利用浏览器自动携带凭据提交动作；与前两者不是同一个问题。

资料：[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)、[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。
