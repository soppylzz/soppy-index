# Cookie、会话固定与 CSRF

用户已登录银行，随后打开另一个站点。后者不知道登录 Cookie 的内容，却可能让浏览器向银行提交表单。要理解为什么，先把 Cookie 的发送规则与服务端对请求意图的验证分开。

会话建立、过期和撤销的完整状态模型见 [认证与会话](../identity/session.md)，这里集中讨论浏览器自动附带凭据的后果。

## Cookie 属性分别限制读取、发送与作用范围

`Secure` 限制在安全连接上传输；`HttpOnly` 阻止页面脚本直接读取；`SameSite` 控制部分跨站请求附带 Cookie 的情形；`Path`/`Domain` 决定发送范围，不能当作可靠的访问隔离。`__Host-` 前缀要求 Secure、Path=/、无 Domain，可缩小子域覆盖风险。host-only Cookie 不设置 Domain，仅发往设置它的主机；设置 Domain 会扩大子域发送范围。Path 只筛选请求路径，不是同源脚本间的安全隔离。

Cookie 只是凭据载体。即使换成 `Authorization: Bearer`，令牌泄漏、XSS、存储、刷新与撤销仍要处理；无论凭据放哪里，服务端都要逐请求检查授权。

## 请求带了 Cookie，为什么还不能证明用户意图

浏览器访问攻击者页面时，可能被诱导向已登录的目标站点提交请求；若浏览器自动附上目标站点的 Cookie，服务端只看 Cookie 就可能误认为是用户有意操作。攻击者通常不需要读到响应。因此 CORS 读取限制本身不能防 CSRF。

```html
<form action="https://bank.example/transfer" method="post">
  <input name="amount" value="100" />
</form>
```

示意表单是否携带 Cookie 取决于 SameSite 等条件；真实防护不能只靠“多数浏览器默认 Lax”。`Lax` 通常阻止跨站 POST 附带 Cookie，却允许部分顶层安全方法导航；因此用 GET 修改状态仍危险。受攻击者控制的同站子域还可能绕开 SameSite 这层跨站限制。

## 让请求携带外站无法构造的证据

有状态服务通常给会话绑定随机 CSRF token，并要求状态改变的请求从表单隐藏字段或自定义头提交；服务端验证 token、Origin/Referer 或 Fetch Metadata 作为额外信号。CSRF token 可以出现在可信页面的表单中，因为外站通常读不到页面；但不能放到 URL，也不能只检查字段存在或让所有用户共享固定值。双重提交 Cookie 是另一种方案，需安全绑定与签名等设计以抵御 Cookie 注入，不能照搬“两个值相同就通过”。

来源检查应比较解析后的精确源；对缺失或 `null` 的 Origin 要按端点契约处理，不能默认可信。Fetch Metadata 可辅助拒绝跨站状态改变请求，但兼容性和合法跨站流程需要单独定义。

`SameSite=Lax/Strict` 降低跨站自动带 Cookie 的机会，不能替代所有场景下的请求意图验证。GET 应避免有副作用；在登录、转账、修改邮箱、退出等流程尤其注意。

```http
Set-Cookie: __Host-session=<opaque>; Path=/; Secure; HttpOnly; SameSite=Lax
```

此为生产 HTTPS 配置示意；`<opaque>` 应是不可猜测的不透明会话标识，而非用户 ID。会话不应出现在 URL；否则易进入历史、日志和 Referer。多设备管理、过期、轮换和撤销要在服务端设计。

若接口只接受脚本显式设置的 Authorization 头，且没有自动附带的替代凭据，传统 Cookie 型 CSRF 的前提通常不成立。但 token 窃取与 XSS 风险仍在；不能只因名叫 Bearer 就推断实际发送方式。

## 根据攻击前提区分固定、劫持与 CSRF

会话固定是攻击者诱导受害者使用已知的会话 ID；登录时轮换 ID 可防护。会话劫持是凭据被盗或复用；TLS、HttpOnly、XSS 防护、设备/风险控制和撤销机制共同降低风险。CSRF 是利用浏览器自动携带凭据提交动作；与前两者不是同一个问题。

资料：[OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)、[OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)。
