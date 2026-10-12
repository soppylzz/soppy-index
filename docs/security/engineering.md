# URL、文件、依赖与前端秘密

## 1. URL 是跨边界输入

开放重定向常见于 `?next=`：登录后直接跳向攻击者地址，会帮助钓鱼或泄漏授权结果。只接受站内相对路径，或把绝对地址与精确允许列表比较；解析前后都要考虑编码、斜杠、用户名段和规范化。服务端代用户抓取 URL 则进一步产生 SSRF 风险，需限制目标、解析后地址、重定向链及私网/元数据端点；仅用字符串前缀检查不可靠。

```js
function safeReturnPath(value) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/"
  const url = new URL(value, "https://app.example")
  return url.origin === "https://app.example" ? `${url.pathname}${url.search}` : "/"
}
```

示例只演示把返回地址约束到当前站点；真实应用还要按产品规则限制允许路径，阻止反斜杠或多重编码造成的解析差异，避免把授权码、token 等放进可跳转 URL。

## 2. 文件上传和下载

前端的 `accept`、文件名扩展名和 MIME 提示都可伪造；服务端要限制大小、检测实际内容、生成安全文件名、隔离存储，并按业务决定扫描/转码。直接以内联 HTML/SVG 提供用户上传内容可能执行脚本；下载时设置正确 `Content-Type`、`Content-Disposition` 与 `nosniff`，必要时使用隔离域。对象 URL 用完要 `URL.revokeObjectURL`，这解决资源管理，不等于文件安全。

## 3. 前端没有长期秘密

任何打包进 JS、HTML、source map 或公开网络请求的密钥都会被用户看到。公开的 API key 只能标识应用或配合域名/配额限制，不能当作真正的服务端秘密。客户端若需要调用高权限 API，让服务端代为调用并校验用户权限。不要把“环境变量”四个字当成保密机制：构建时注入前端包的变量仍是公开数据。

## 4. 供应链与原型污染

依赖、构建脚本、CDN 脚本和 lockfile 都属于代码供应链；固定版本、审查更新、最小权限、来源验证与自动化告警可降低风险。第三方脚本在页面同源环境下通常能接触 DOM 与非 HttpOnly 数据，不能只靠 HTTPS 信任它。可用 SRI 校验固定的跨源静态资源，但动态脚本更新需要另设流程。

将不可信对象深度合并时，`__proto__`、`constructor`、`prototype` 等键可能污染对象原型，影响授权判断或配置。优先用经过维护的合并库、限定 schema、拒绝危险键；不要只靠 `Object.freeze` 某个业务对象。

## 5. 做一次安全复盘

沿“输入 → 解析 → 存储 → 输出 → 权限判断”追踪一条数据，标出每次跨越浏览器、代理、应用和第三方的边界。用 DevTools 看最终响应头和 Cookie 属性，再用服务端测试验证越权、CSRF token、上传类型与重定向。浏览器 UI 隐藏和源码审查只能提供线索，不能代替服务端验证。

资料：[OWASP Unvalidated Redirects](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)、[OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html)、[OWASP Prototype Pollution](https://cheatsheetseries.owasp.org/cheatsheets/Prototype_Pollution_Prevention_Cheat_Sheet.html)。
