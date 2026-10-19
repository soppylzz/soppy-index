# SPA 与 PKCE：没有 client secret，为什么能兑换授权码

SPA 的 JavaScript 会被下载到用户设备。把 client secret 写进环境变量并打包，仍会把它公开，所以 SPA 是公开客户端。它不能通过保守一份所有用户共享的 secret 证明身份，但仍可以用 PKCE 绑定自己发起的一次授权交易。

## challenge 先出发，verifier 留到兑换时

客户端为每次交易生成高熵随机 verifier，再计算 `BASE64URL(SHA256(verifier))` 作为 S256 challenge。授权请求携带 challenge，服务器把它与 code 关联；兑换时客户端提交 verifier，服务器重新计算并比较。

攻击者若只截获 code，却不知道 verifier，就无法完成这次兑换。这里不等于为 SPA 创造了可永久保守的客户端秘密；verifier 是交易级随机值，活跃 XSS 若能读取它或控制客户端流程，仍会威胁安全。

state 关联浏览器回调，nonce 关联经验证的 ID token。PKCE、state 和 nonce 不是三种登录方式，也不能用“用了 PKCE”代替对完整协议上下文的分析。满足规范条件时，它们的部分 CSRF 保护可以重叠，具体要求由协议库和配置承担。

## token 端点和资源 API 都可能跨源

纯 SPA 直接向 token 端点兑换 code，提供方必须支持相应公开客户端与 CORS。Authorization 头调用资源 API 常触发预检。CORS 允许脚本读响应，不会替 API 验签或执行资源授权；脚本看见错误也不能据此判断服务端是否已收到请求。

实验把待处理交易存到 sessionStorage，以便跳转后恢复；验证 ID token 后将 access token 保存在 React 组件内存中。刷新页面会丢失 token，但 sessionStorage 并不是抵抗 XSS 的保险箱，内存 token 也能被活跃恶意脚本借用。浏览器使用 Web Crypto 验证固定算法和可信 JWKS，并校验 issuer、audience、过期与 nonce。

## 如何选择 SPA 还是 BFF

SPA 直接调用资源服务器，少一次代理，但浏览器承担更多凭据与刷新管理；BFF 把 token 管理放在服务端，同时引入会话和代理成本。决定因素是部署、第三方 API 能力、风险和后端职责，不是“JWT 比 Cookie 新”。

本实验不发 refresh token。真实公开客户端若获得 refresh token，还需要规范要求的 rotation 或发送方约束，并处理标签页并发、网络重试与重用检测。前端清掉一个 token 引用，只影响本地状态，不会撤销服务器已经接受的凭据。

参考：[RFC 7636](https://www.rfc-editor.org/rfc/rfc7636)、[RFC 9700 §2.2.2](https://www.rfc-editor.org/rfc/rfc9700.html#section-2.2.2)。
