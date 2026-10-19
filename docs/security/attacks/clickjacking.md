# 点击劫持：用户以为自己点了哪里

用户以为点的是领取优惠按钮，实际操作却落在透明框架中的敏感按钮上。攻击者不必读取目标页面的 DOM，只需让用户在错误的视觉上下文中点击。

## 点击劫持借用的是视觉与点击

攻击者把目标站嵌在透明或伪装的 iframe 中，让用户以为在点自己的页面，实际点到目标站按钮。它依赖目标页允许被攻击者站点嵌入，且有可被诱导的敏感操作。服务端设置 `Content-Security-Policy: frame-ancestors 'none'` 可禁止嵌入，或只允许明确可信的父页面；旧环境可补 `X-Frame-Options: DENY/SAMEORIGIN`。`frame-src` 是限制本页加载哪些子框架，不能代替 `frame-ancestors`。

双重确认、交易摘要和重新认证可降低敏感操作被误点的后果，但不能代替嵌入策略。页面用 JavaScript 检查 `top !== self` 再跳出框架的做法不可靠；浏览器策略头在加载边界更合适。

```http
Content-Security-Policy: frame-ancestors 'self'
```

如果业务确实需要嵌入到合作方站点，要列出精确允许源并测试不同部署域。`SameSite` Cookie 可能让跨站 iframe 中的登录状态不同，但不应把这种偶然阻断当作主要防线。

## 新窗口的引用也可能形成攻击路径

reverse tabnabbing 利用新窗口保留的 opener 引用影响原页面导航。无需回传窗口引用的外链应明确使用 noopener；noreferrer 还涉及来源信息控制，二者目的不同。现代浏览器对部分新窗口场景有默认隔离行为，但不应据此假定所有创建方式都相同。

UI redressing 还可能误导拖拽、键盘或权限操作，敏感确认需显示明确对象与上下文。iframe sandbox 的同源、脚本权限组合由浏览器 iframe 章节维护，不能把“加了 sandbox”视为无需分析权限。

参考：[OWASP Clickjacking Defense](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html)。
