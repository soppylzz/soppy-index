# 同源、CORS 与跨窗口边界

## 1. 同源和同站不是一个概念

同源按 scheme、host、port 比较；`https://app.example.com` 与 `https://api.example.com` 不同源。同站用于 Cookie SameSite 等场景，通常基于 scheme 与可注册域名判断；两个子域可能同站却不同源。端口改变会跨源，但通常不会改变站点判断。不要用“跨域”含糊代替具体边界。

同源策略限制脚本读取其他源的 DOM、响应等；它不意味着跨源请求发不出去。例如 `<img>`、表单、导航可以跨源，`fetch` 也能发起受 CORS 约束的请求。CORS 是服务端通过响应头授权浏览器把响应交给某个源的脚本。

## 2. CORS 请求怎样判断

带凭据的跨源 `fetch` 要设置 `credentials: "include"`，且服务端必须返回精确的 `Access-Control-Allow-Origin` 和 `Access-Control-Allow-Credentials: true`；`*` 不能与凭据组合。需要预检时，浏览器先发 `OPTIONS`，检查允许的方法、请求头、源；预检通常不携带跨源凭据。预检失败不表示主请求已发；非预检请求被 CORS 拒绝时，服务器可能已经处理了业务动作。

```js
const response = await fetch("https://api.example.com/profile", {
  credentials: "include",
})
if (!response.ok) throw new Error(`HTTP ${response.status}`)
```

这段代码只有在服务器正确配置 CORS、Cookie 的 Domain/SameSite/Secure 等条件也满足时才能读到响应。CORS 不能代替认证、授权或 CSRF 保护。动态反射 `Origin` 前必须用精确允许列表校验，并设置适当 `Vary: Origin`，避免共享缓存混淆。

## 3. iframe、postMessage 与 WebSocket

跨源 iframe 之间不能直接读 DOM；用 `postMessage` 传数据时发送方指定确切 `targetOrigin`，接收方校验 `event.origin` 和消息结构，必要时还校验 `event.source`。`*` 只适合确实不敏感的广播。

WebSocket 握手通常带 `Origin`，但 WebSocket 不沿用 CORS 预检与读取授权机制。服务端若用 Cookie 认证，必须校验允许的 Origin、鉴权和业务权限，防止跨站 WebSocket 劫持。SSE 是 HTTP 响应，跨源使用仍需满足 CORS 条件。

```js
window.addEventListener("message", (event) => {
  if (event.origin !== "https://trusted.example") return
  if (event.data?.type !== "ready") return
  console.log("trusted frame ready")
})
```

资料：[Fetch 标准](https://fetch.spec.whatwg.org/)、[HTML 标准：跨文档消息](https://html.spec.whatwg.org/multipage/web-messaging.html)、[RFC 6455](https://www.rfc-editor.org/rfc/rfc6455)。
