# 点击劫持与 DOM Clobbering

## 1. 点击劫持的前提

攻击者把目标站嵌在透明或伪装的 iframe 中，让用户以为在点自己的页面，实际点到目标站按钮。它依赖目标页允许被攻击者站点嵌入，且有可被诱导的敏感操作。服务端设置 `Content-Security-Policy: frame-ancestors 'none'` 可禁止嵌入，或只允许明确可信的父页面；旧环境可补 `X-Frame-Options: DENY/SAMEORIGIN`。`frame-src` 是限制本页加载哪些子框架，不能代替 `frame-ancestors`。

双重确认、交易摘要和重新认证可降低敏感操作被误点的后果，但不能代替嵌入策略。页面用 JavaScript 检查 `top !== self` 再跳出框架的做法不可靠；浏览器策略头在加载边界更合适。

```http
Content-Security-Policy: frame-ancestors 'self'
```

如果业务确实需要嵌入到合作方站点，要列出精确允许源并测试不同部署域。`SameSite` Cookie 可能让跨站 iframe 中的登录状态不同，但不应把这种偶然阻断当作主要防线。

## 2. DOM Clobbering 是什么

HTML 中元素的 `id`/`name` 可能在某些 DOM 命名访问场景中暴露为全局或表单属性。若攻击者能注入 HTML 标记但不能直接注入脚本，仍可能构造元素覆盖代码期望的对象/属性，改变后续脚本的数据流。例如代码依赖 `window.config`，而页面里有攻击者可控的 `<a id="config">`，在特定查找方式下可能读到元素而非预期配置。

主防线是不要把未清理的 HTML 放入页面，也不要通过 `window.someName`、`document.someName` 或表单的动态命名属性获取安全关键对象。使用模块局部变量、显式 `getElementById` 后检查类型，并对富文本做合适清理。CSP 可限制最终脚本执行，但不能修复所有 DOM 命名冲突导致的逻辑误用。

## 3. 面试比较

XSS 是不可信数据被解释为可执行代码；DOM Clobbering 可以先劫持对象引用，再借合法脚本执行危险操作。点击劫持则利用页面视觉层和用户点击，攻击者未必能读到目标页 DOM。区分攻击前提，才能选择正确防护。

资料：[OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)、[OWASP DOM Clobbering Prevention](https://cheatsheetseries.owasp.org/cheatsheets/DOM_Clobbering_Prevention_Cheat_Sheet.html)。
