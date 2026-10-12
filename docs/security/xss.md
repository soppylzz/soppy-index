# XSS：让数据意外进入代码解释器

## 1. 三种入口，一条共同机制

反射型 XSS 常把请求参数直接插回响应；存储型先持久化恶意内容，再展示给别人；DOM 型由客户端脚本把不可信数据送进危险 DOM API。三者共同点是数据被浏览器当成 HTML/脚本执行。XSS 能以受害者页面身份读可访问的数据、发送请求、窃取非 HttpOnly 凭据；`HttpOnly` 不能阻止脚本利用现有会话调用同源接口。

```js
const name = new URLSearchParams(location.search).get("name") ?? "访客"
document.querySelector("#welcome").textContent = name
```

`textContent` 把值作为文本。若改成 `innerHTML = name`，攻击者可注入标记及可执行结构。框架默认的文本插值通常会转义，但 `dangerouslySetInnerHTML`、`v-html`、模板逃逸口和第三方组件仍需审查。

## 2. 防护按输出位置选

- 普通 HTML 文本：使用框架默认文本插值或 DOM `textContent`。
- HTML 属性：固定属性名，使用框架安全绑定；事件处理属性、`srcdoc` 等不能只靠普通转义。
- URL：解析、限制协议与允许的目标，尤其是 `href`、`src`、跳转与下载地址。
- 真要展示用户富文本：用维护良好的 HTML sanitizer 按业务允许标签/属性清理，再审查后续 DOM 操作。
- 避免 `eval`、字符串形式的 `setTimeout`、拼接脚本；服务端模板内嵌 JSON 要遵守所在 HTML/JS 双重上下文。

“统一把 `<` 替换成实体”不是通用方案：HTML、JS、CSS、URL 有不同解析规则。输入校验可减少垃圾数据，但主要防线是安全 API 与恰当的输出编码/清理。

## 3. CSP 与 Trusted Types 的位置

CSP 可限制脚本来源和执行方式；基于 nonce/hash 的严格策略通常优于大范围域名白名单。Trusted Types 可把危险 DOM sink 收束到受审查的创建策略。两者是纵深防御，不能代替修复危险拼接；若受信任脚本本身把攻击者内容注入到不安全 sink，CSP 也可能无能为力。先修数据流，再配置防护头。

面试追问：“有 HttpOnly Cookie 就不怕 XSS？”错。它可降低直接读取 Cookie 的风险，但脚本仍能在该源发起已登录请求并读取同源响应。见 [会话防护](session-csrf.md)。

资料：[OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet)、[OWASP DOM XSS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)。
