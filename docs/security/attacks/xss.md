# XSS：让数据意外进入代码解释器

搜索页需要展示 URL 中的名字。开发者想加入一点排版，把字符串拼进 `innerHTML`；这个改动同时把攻击者输入交给了 HTML 解析器。XSS 的关键就在数据跨进可执行上下文的那一步。

## 从输入入口追到危险 sink

反射型 XSS 常把请求参数直接插回响应；存储型先持久化恶意内容，再展示给别人；DOM 型由客户端脚本把不可信数据送进危险 DOM API。三者共同点是不可信输入最终进入可执行上下文。反射/存储描述输入如何到达页面，DOM 型强调客户端的数据流，它们不是完全互斥的分类：存储内容也可能被客户端送进危险 sink。XSS 能以受害者页面身份读可访问的数据、发送请求、窃取非 HttpOnly 凭据；`HttpOnly` 不能阻止脚本利用现有会话调用同源接口。

```js
const name = new URLSearchParams(location.search).get("name") ?? "Guest"
document.querySelector("#welcome").textContent = name
```

`textContent` 把值作为文本。若改成 `innerHTML = name`，攻击者可注入标记及可执行结构。通过 innerHTML 插入的 script 元素通常不会执行，但事件处理属性等仍可能形成执行路径，所以不能用“插入 script 没弹窗”证明安全。框架默认的文本插值通常会转义，但 `dangerouslySetInnerHTML`、`v-html`、模板逃逸口和第三方组件仍需审查。

## 同一个字符串，输出位置改变就要重新判断

- 普通 HTML 文本：使用框架默认文本插值或 DOM `textContent`。
- HTML 属性：固定属性名，使用框架安全绑定；事件处理属性、`srcdoc` 等不能只靠普通转义。
- URL：解析、限制协议与允许的目标，尤其是 `href`、`src`、跳转与下载地址。
- 真要展示用户富文本：用维护良好的 HTML sanitizer 按业务允许标签/属性清理，再审查后续 DOM 操作。
- 避免 `eval`、字符串形式的 `setTimeout`、拼接脚本；服务端模板内嵌 JSON 要遵守所在 HTML/JS 双重上下文。

例如 `href` 的字符串即使没有尖括号，若允许 `javascript:` 等危险协议，仍可能执行代码；编码引号也没有解决目标协议问题。富文本 sanitizer 清理完后若再次拼接未信任属性，也可能破坏清理结果。

“统一把 `<` 替换成实体”不是通用方案：HTML、JS、CSS、URL 有不同解析规则。输入校验可减少垃圾数据，但主要防线是安全 API 与恰当的输出编码/清理。

## CSP 与 Trusted Types 为什么只能补充主防线

CSP 可限制脚本来源和执行方式；基于 nonce/hash 的严格策略通常优于大范围域名白名单。Trusted Types 可把危险 DOM sink 收束到受审查的创建策略。两者是纵深防御，不能代替修复危险拼接；若受信任脚本本身把攻击者内容注入到不安全 sink，CSP 也可能无能为力。先修数据流，再配置防护头。

以 HttpOnly Cookie 为例，它可降低直接读取 Cookie 的风险，但脚本仍能在该源发起已登录请求并读取同源响应。见 [会话防护](csrf.md)。

## Trusted Types 怎样收束危险入口

在支持的浏览器中，可用 CSP 的 require-trusted-types-for 约束受覆盖的 DOM 注入 sink，要求它们接收 TrustedHTML 等受控值。应用通过命名 policy 集中执行 sanitizer；这让危险转换更容易审查，但 policy 如果原样返回任意输入，就只是给漏洞加了一层包装。

Trusted Types 不是通用 HTML 清理器，不验证业务授权，也不自动保证所有 URL 安全。支持程度需按目标浏览器验证，框架默认转义与正确输出上下文仍是基础。规范机制见 [Trusted Types](https://www.w3.org/TR/trusted-types/)。

资料：[OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet)、[OWASP DOM XSS Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)。
