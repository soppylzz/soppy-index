# CORS 与预检：为什么 JSON 请求前多了一个 OPTIONS

页面 `https://app.example` 请求 `https://api.example/items`，即使它们属于同一组织，也因为 host 不同而跨源。源由 scheme、host、port 共同决定；CORS 是浏览器控制跨源响应是否可以交给脚本的一套协议。

## 跟随一次跨源修改请求

```js
const response = await fetch("https://api.example/items/42", {
  method: "PATCH",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ title: "Updated title" }),
})
if (!response.ok) throw new Error(`HTTP ${response.status}`)
```

浏览器发现这是跨源请求，方法与内容类型也不满足免预检条件。若没有可复用的预检许可，先询问：

```http
OPTIONS /items/42 HTTP/1.1
Host: api.example
Origin: https://app.example
Access-Control-Request-Method: PATCH
Access-Control-Request-Headers: content-type
```

`OPTIONS` 这里表达的是许可查询，还没有发送业务 JSON。符合 CORS 协议的预检本身不携带 Cookie 等凭据，服务端不应要求用户先以 Cookie 登录才能回答预检。业务请求仍要独立鉴权。

```http
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example
Access-Control-Allow-Methods: PATCH
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Credentials: true
Access-Control-Max-Age: 600
Vary: Origin
```

预检通过后，浏览器才发送实际 PATCH。实际响应仍必须带匹配的 `Access-Control-Allow-Origin`，凭据模式下还需要 `Access-Control-Allow-Credentials: true`，否则脚本仍无法读取。`Max-Age` 可让许可在一定条件下被复用，浏览器还有自己的上限；不能把它和资源的 HTTP 缓存混为一谈。

## 哪些请求通常不用预检

常说的“简单请求”对应 Fetch 规范的 CORS safelist 条件。常见情况是使用 GET、HEAD 或 POST，并且脚本设置的请求字段及其值都在允许范围；POST 的 `Content-Type` 常见允许类型是 `text/plain`、`application/x-www-form-urlencoded`、`multipart/form-data`，还受参数和值等规则限制。使用流式请求体等功能也可能触发预检，不能只背方法名。

`POST + application/json` 通常会预检；带 `Authorization` 的跨源 GET 通常也会预检。Cookie 是否发送由凭据模式和 Cookie 策略等决定，携带 Cookie 本身不是自动触发预检的条件。

免预检的请求可能直接到达服务端，但其响应依然接受 CORS 检查。因此“控制台报 CORS”不能证明业务没有执行；反过来，若预检失败，浏览器通常不会发送本次实际业务请求。

## 凭据与可读字段

凭据模式为 `include` 时，允许源不能使用 `*`，需要返回被许可的具体源。不要把任意 `Origin` 原样反射；应先经过允许列表判断。动态按源生成响应时，`Vary: Origin` 帮助缓存区分不同源的响应。

业务响应里的自定义字段也不一定能被脚本读取。若要访问 `X-Request-ID`，服务端可以发送：

```http
Access-Control-Expose-Headers: X-Request-ID
```

`Allow-Headers` 回答请求可以带哪些字段，`Expose-Headers` 回答脚本可以读取哪些响应字段。两者方向相反。

## 为什么 curl 成功，浏览器失败

curl 不执行浏览器的同源读取限制。`mode: "no-cors"` 也不是关闭安全策略：它限制请求能力，返回的 opaque response 无法供脚本正常读取状态和内容。

CORS 不替代认证，也不替代 CSRF 防护；恶意网站仍可能发出某些免预检请求。跨站 Cookie 还会受到 SameSite 和浏览器策略影响，即使 CORS 配置正确也不保证 Cookie 一定发送。安全侧详见 [源与 CORS](../../security/foundations/origin-cors.md)和 [CSRF](../../security/attacks/csrf.md)。

资料：[Fetch Standard：CORS 协议](https://fetch.spec.whatwg.org/#http-cors-protocol)、[CORS-preflight fetch](https://fetch.spec.whatwg.org/#cors-preflight-fetch)。
