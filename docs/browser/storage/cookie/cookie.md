# Cookie

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

“自动发送”仍受请求配置约束。例如 fetch 的 credentials 默认是 same-origin，跨源请求设置 include 也不能绕过 SameSite 或第三方 Cookie 策略。Cookie 是否携带与响应能否被脚本读取是不同问题；CORS 报错不能单独证明服务端没收到请求。[Request.credentials](https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials)

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

脚本可通过 document.cookie 读取当前文档可见且非 HttpOnly 的 Cookie，仍受 domain、path 及存储策略等条件约束，并非浏览器中的全部 Cookie。反射型或存储型 XSS 执行后，可能读取其中的会话标识并向外发送；能否外传还受 CSP 等条件影响。[document.cookie 文档](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie)

`HttpOnly` 让会话 Cookie 对脚本不可见，直接切断这条窃取路径。但它只防"读"不防"用"：若 XSS 已能在页面中执行，攻击者仍可借用户现有会话在同源内发起请求（此时 Cookie 照常附带）。因此 HttpOnly 需与 CSP、输入输出转义、敏感操作二次校验等纵深防护配合，详见 [MDN：XSS](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/XSS)。

### Secure：防明文截获

带 `Secure` 的 Cookie 只在安全通道（HTTPS）上发送，避免会话在 HTTP 明文传输或降级请求中被网络中间人截获。`SameSite=None` 必须同时设置 `Secure`，否则现代浏览器会拒绝写入。

> 本地开发时，浏览器可对 localhost 的 Secure Cookie 放宽 HTTPS 要求，但本地安全上下文判定与 Cookie 实现策略不能直接画等号。当前 demo 使用 HTTP localhost，先检查目标浏览器是否实际接受并携带该 Cookie；生产部署使用 HTTPS，不依赖本地例外。[Set-Cookie 文档](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie)

### SameSite：防跨站携带（CSRF）

CSRF 的前提是：受害浏览器向目标站点发请求时自动附带会话 Cookie，攻击者站点借这道"自动附带"伪造用户操作。`SameSite` 从源头限制跨站请求是否携带：

| 取值 | 跨站行为 |
| --- | --- |
| `Strict` | 完全不随跨站请求发送 |
| `Lax` | 只随顶级导航的安全方法（GET 等）发送；跨站 POST 表单和 img/fetch 等子资源一律不携带 |
| `None` | 不因 SameSite 限制跨站携带，必须配合 Secure；仍受匹配、请求配置及第三方 Cookie 策略约束 |

Lax 为顶级安全方法导航保留携带 Cookie 的机会，使外站链接进入站点时可继续识别已有会话；实际是否登录还取决于 Cookie 与服务端会话状态。如果服务端在 GET 上做状态变更，Lax 不能保护这种顶级导航。完整 CSRF 攻击面见 [MDN：CSRF](https://developer.mozilla.org/en-US/docs/Web/Security/Attacks/CSRF)。

关于 site 的判定，注意两点：

- site 与同源策略的 origin 不是同一概念：site 由 scheme + registrable domain 决定，忽略端口。`localhost:3000` 与 `localhost:3001` 跨源但同站；而 `localhost` 与 `127.0.0.1` 是跨站的（host 不同）。
- 未声明 SameSite 时，部分浏览器默认采用 Lax，并可能有设置后短时间内允许顶级跨站 POST 的兼容宽限。这与显式 SameSite=Lax 不应混为一谈；应显式声明，并按目标浏览器核对默认策略。

### 攻击与防护对照

| 攻击 | 载体 | 主要防线 | 服务端仍需 |
| --- | --- | --- | --- |
| XSS 窃取会话 | 同源脚本读 `document.cookie` | `HttpOnly` | 输出转义、CSP、敏感操作校验 |
| CSRF 跨站 POST | 自动提交的跨站表单 | `SameSite=Lax/Strict` | CSRF token、Origin/Referer 校验 |
| CSRF 跨站 GET | img 子资源 / 顶级导航链接 | `SameSite=Lax`（仅拦子资源） | GET 不做状态变更 + token |
| 明文截获 | HTTP 传输 / 降级请求 | `Secure` | 全站 HTTPS、HSTS |

> 三个属性约束不同环节：Secure 限制传输条件，HttpOnly 限制脚本访问，SameSite 限制跨站携带。它们都不替代服务端认证与授权。采用 Cookie 认证的状态变更接口，应结合认证模型设计 CSRF token、来源校验等防护，不能仅凭 SameSite 或“响应不可跨源读取”认定没有 CSRF 风险。

## 4. Host-only、Domain 与 Cookie prefix

省略 `Domain` 时，Cookie 只发送给设置它的 host；显式设置 `Domain=example.com` 时，它也可能发送给符合规则的子域。

Cookie prefix 可把部分安全约束编码进名称。例如 `__Host-` Cookie 必须：

- 由安全来源设置并带 `Secure`；
- 使用 `Path=/`；
- 不带 `Domain`。

因此 `__Host-session` 能减少子域或路径配置带来的覆盖风险。prefix 是配置约束，不替代随机、不可预测的会话标识和服务端校验。

## 5. document.cookie

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

## 6. Cookie 不是 session，也不是 token

- session 是服务端保存状态并通过某个标识关联请求的模型。
- Cookie 是浏览器保存和传输状态的机制。
- token 是凭证或声明的格式。

常见做法是把随机 session ID 放入 HttpOnly Cookie。把 access token 放在 `localStorage` 可避免浏览器自动携带，但同源 JavaScript 和成功执行的 XSS 可以读取它；放入 HttpOnly Cookie 可以阻止脚本直接读取，却需要设计 CSRF 防护。不存在脱离威胁模型的"绝对安全存储位置"。

Cookie 在 HTTP 状态管理中的使用见 [MDN：Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)。

## 7. 第三方 Cookie 与分区

第三方上下文中的 Cookie 越来越受到浏览器默认策略、用户设置和分区机制限制。`Partitioned` 属性用于 CHIPS：Cookie 会按顶层站点分区，使同一个第三方嵌入不同站点时不再共享同一份状态。

不要依赖"所有浏览器都会允许第三方 Cookie"。嵌入式登录、支付或小组件应按目标浏览器测试，并在需要访问未分区状态时评估 Storage Access API 等明确授权机制。

## 8. 大小与性能

Cookie 会随所有匹配请求发送，因此它更适合小型状态标识，不适合保存大型 JSON、用户资料或离线数据。具体单条大小和数量限制由浏览器实现决定；超过限制可能被拒绝或淘汰，不应依赖一个固定数字。

如果数据只供客户端使用，可考虑 Web Storage 或 IndexedDB；如果数据是可重新获取的 response，可考虑 HTTP cache 或 Cache Storage。

## 9. 兼容性与检测

基础 Cookie 和常用属性兼容性很好，但 `Partitioned`、Cookie Store API 及第三方 Cookie 政策存在差异。服务端应在实际请求上验证 Cookie 是否到达，前端不要仅凭写入代码未报错就推断成功。

兼容性见 [MDN：Set-Cookie](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie#browser_compatibility)、[MDN：Document.cookie](https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie#browser_compatibility) 与 [MDN：Cookie Store API](https://developer.mozilla.org/en-US/docs/Web/API/Cookie_Store_API#browser_compatibility)。

## 10. 用请求与脚本分别验证限制

假设登录 Cookie 带有 HttpOnly，同源脚本读不到它，但脚本发起的请求仍可能携带它。这说明“限制脚本读取”和“限制请求发送”作用在两个环节。继续换成跨站导航或子资源请求，再结合 SameSite、Secure 和请求上下文判断携带条件，不能只根据是否跨源作答。

[Cookie 实验](./index.md)对照跨站表单、子资源与同源脚本读取。先预测 Cookie 是否携带，再检查 Network 与服务端日志；两个登录变体同时改变了 SameSite 与 HttpOnly，必须按观察环节分别归因。

## 11. 参考资料

- [RFC 6265bis：Cookies](https://httpwg.org/http-extensions/draft-ietf-httpbis-rfc6265bis.html)
- [MDN：Using HTTP cookies](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Cookies)
- [MDN：Secure cookie configuration](https://developer.mozilla.org/en-US/docs/Web/Security/Practical_implementation_guides/Cookies)
- [web.dev：SameSite cookies explained](https://web.dev/articles/samesite-cookies-explained)
